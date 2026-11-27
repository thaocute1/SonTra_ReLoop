from contextlib import ExitStack, nullcontext
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import Users
from .models import Vendors
from .serializers.vendor_serializers import VendorApplicationDetailSerializer, VendorRegisterSerializer
from .services.trip_chat_service import TripChatService
from .services.vendor_service import VendorService
from .views.vendor_views import (
    VendorApplicationDetailView,
    VendorApplicationReviewView,
    VendorCompanyProfileView,
    VendorDashboardView,
    VendorTripChatMessagesView,
)


class VendorDashboardAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = VendorDashboardView.as_view()

    def get(self, role=None, **params):
        request = self.factory.get('/api/v1/vendors/dashboard/', params)
        if role:
            user = SimpleNamespace(id=17, role=role, is_authenticated=True)
            force_authenticate(request, user=user)
        return self.view(request)

    def test_rejects_anonymous_and_non_vendor_requests(self):
        for role in (None, 'customer', 'system_admin'):
            with self.subTest(role=role):
                self.assertIn(self.get(role, vendor_id=42).status_code, (401, 403))

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    @patch('apps.vendors.views.vendor_views.VendorService.get_vendor_dashboard')
    def test_uses_authenticated_vendor_for_report(self, dashboard, vendors):
        vendors.return_value.values_list.return_value.first.return_value = 23
        dashboard.return_value = {'vendor_info': {'id': 23}}
        response = self.get('vendor_admin', vendor_id=42, period='7d')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['vendor_info']['id'], 23)
        vendors.assert_called_once_with(user_id=17, deleted_at__isnull=True)
        dashboard.assert_called_once_with(23, '7d')

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_rejects_unknown_period(self, vendors):
        vendors.return_value.values_list.return_value.first.return_value = 23
        self.assertEqual(self.get('vendor_admin', period='custom').status_code, 400)

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_rejects_vendor_account_without_profile(self, vendors):
        vendors.return_value.values_list.return_value.first.return_value = None
        self.assertEqual(self.get('vendor_admin').status_code, 403)


class VendorCompanyProfileAccessTests(SimpleTestCase):
    def get(self, user=None):
        request = APIRequestFactory().get('/api/v1/vendors/profile/', {'vendor_id': 42})
        if user is not None:
            force_authenticate(request, user=user)
        return VendorCompanyProfileView.as_view()(request)

    def test_blocks_anonymous_and_customer_requests(self):
        self.assertIn(self.get().status_code, (401, 403))
        customer = SimpleNamespace(id=17, role='customer', is_authenticated=True)
        self.assertEqual(self.get(customer).status_code, 403)

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_only_returns_profile_owned_by_authenticated_account(self, vendors):
        owner = Users(id=17, email='vendor@example.test')
        vendor = Vendors(id=23, brand_name='Đối tác kiểm tra', user=owner)
        vendor.guides_count = 0
        vendor.initial_password = 'private'
        vendors.return_value.select_related.return_value.annotate.return_value.first.return_value = vendor
        user = SimpleNamespace(id=17, role='vendor_admin', is_authenticated=True)
        response = self.get(user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['id'], 23)
        self.assertEqual(response.data['data']['guides_count'], 0)
        self.assertNotIn('initial_password', response.data['data'])
        vendors.assert_called_once_with(user_id=17, deleted_at__isnull=True)


class VendorServiceAndReviewTests(SimpleTestCase):
    def test_register_vendor_uses_valid_model_fields_only(self):
        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            users = stack.enter_context(patch(module + 'Users'))
            vendors = stack.enter_context(patch(module + 'Vendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            users.objects.create.return_value = Mock()
            vendors.objects.create.return_value = SimpleNamespace(id=1, brand_name='Son Tra Eco')

            VendorService.register_vendor({
                'brand_name': 'Son Tra Eco',
                'email': 'partner@example.com',
                'phone': '0905111222',
                'business_license_code': 'BL-001',
                'password': 'StrongPassword123!',
            })

            create_kwargs = vendors.objects.create.call_args.kwargs
            valid_fields = {f.name for f in Vendors._meta.fields}
            self.assertTrue(set(create_kwargs).issubset(valid_fields))
            self.assertEqual(create_kwargs['commission_rate'], Decimal('0.1000'))
            self.assertNotIn('tax_number', create_kwargs)
            self.assertNotIn('profile_data', create_kwargs)

    def test_review_application_preserves_password_and_omits_initial_password(self):
        user = Users(id=11, email='partner@example.com', password_hash='existing-hash', status='unverified')
        user.save = Mock()
        user.set_password = Mock()
        vendor = Vendors(id=5, user=user, brand_name='Partner', status='pending_approval')
        vendor.save = Mock()

        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            vendors = stack.enter_context(patch(module + 'Vendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            vendors.objects.select_related.return_value.get.return_value = vendor

            updated = VendorService.review_application(5, 'approved')

        user.set_password.assert_not_called()
        self.assertEqual(user.status, 'active')
        serialized = VendorApplicationDetailSerializer(updated).data
        self.assertNotIn('initial_password', serialized)

    def test_application_detail_and_review_require_bql_and_call_existing_method(self):
        factory = APIRequestFactory()
        anon_req = factory.get('/api/v1/vendors/applications/5/')
        self.assertIn(VendorApplicationDetailView.as_view()(anon_req, pk=5).status_code, (401, 403))

        bql_user = SimpleNamespace(id=99, role='system_admin', is_authenticated=True)
        auth_req = factory.get('/api/v1/vendors/applications/5/')
        force_authenticate(auth_req, user=bql_user)
        with patch.object(VendorService, 'get_application_detail', return_value=None) as detail_mock:
            res = VendorApplicationDetailView.as_view()(auth_req, pk=5)
        self.assertEqual(res.status_code, 404)
        detail_mock.assert_called_once_with(5)

        patch_req = factory.patch('/api/v1/vendors/applications/5/review/', {'status': 'approved'}, format='json')
        force_authenticate(patch_req, user=bql_user)
        with patch.object(VendorService, 'get_application_detail', return_value=None) as detail_mock2:
            res2 = VendorApplicationReviewView.as_view()(patch_req, pk=5)
        self.assertEqual(res2.status_code, 404)
        detail_mock2.assert_called_once_with(5)

    def test_register_vendor_ignores_spoofed_commission_rate(self):
        with patch('apps.vendors.serializers.vendor_serializers.Users.objects.filter') as u_filter, \
             patch('apps.vendors.serializers.vendor_serializers.Vendors.objects.filter') as v_filter:
            u_filter.return_value.exists.return_value = False
            v_filter.return_value.exists.return_value = False
            serializer = VendorRegisterSerializer(data={
                'brand_name': 'Evil Partner',
                'email': 'evil@example.com',
                'phone': '0905999888',
                'commission_rate': '-0.5000',
            })
            self.assertTrue(serializer.is_valid(), serializer.errors)
            self.assertNotIn('commission_rate', serializer.validated_data)

        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            users = stack.enter_context(patch(module + 'Users'))
            vendors = stack.enter_context(patch(module + 'Vendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            users.objects.create.return_value = Mock()
            vendors.objects.create.return_value = SimpleNamespace(id=2, brand_name='Evil Partner')

            VendorService.register_vendor({
                'brand_name': 'Evil Partner',
                'email': 'evil@example.com',
                'commission_rate': Decimal('0.0000'),
            })
            self.assertEqual(vendors.objects.create.call_args.kwargs['commission_rate'], Decimal('0.1000'))


class TripChatSecurityTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.customer = SimpleNamespace(id=12, email='cust@example.com', role='customer', is_authenticated=True)

    def test_user_can_access_trip_rejects_missing_or_invalid_date(self):
        with patch('apps.vendors.services.trip_chat_service.OrderItems.objects.filter') as oi_filter:
            for bad_date in (None, '', 'invalid-date', '2026-99-99'):
                self.assertFalse(TripChatService.user_can_access_trip(self.customer, 6, bad_date))
        oi_filter.assert_not_called()

    def test_user_can_access_trip_requires_paid_confirmed_booking_for_customer(self):
        with patch('apps.vendors.services.trip_chat_service.OrderItems.objects.filter') as oi_filter:
            oi_filter.return_value.exists.return_value = True
            allowed = TripChatService.user_can_access_trip(self.customer, 6, '2026-11-20')

        self.assertTrue(allowed)
        oi_filter.assert_called_once_with(
            tour_id=6,
            order_vendor__order__customer_id=12,
            order_vendor__scheduled_date=date(2026, 11, 20),
            order_vendor__status__in=['confirmed', 'completed'],
            order_vendor__order__payment_status='paid',
        )

    def test_get_trip_messages_and_send_message_reject_invalid_date(self):
        with self.assertRaises(ValueError):
            TripChatService.get_trip_messages(6, 'bad-date', current_user_id=12)
        with patch('apps.vendors.services.trip_chat_service.Tours.objects.filter') as tours_filter:
            tours_filter.return_value.first.return_value = SimpleNamespace(id=6)
            with self.assertRaises(ValueError):
                TripChatService.send_message(6, '', 'Hello', sender_id=12)

    def test_trip_chat_view_returns_400_for_missing_or_invalid_date(self):
        for params in ({'tour_id': 6}, {'tour_id': 6, 'date': 'not-a-date'}):
            req = self.factory.get('/api/v1/vendors/inbox/messages/', params)
            force_authenticate(req, user=self.customer)
            resp = VendorTripChatMessagesView.as_view()(req)
            self.assertEqual(resp.status_code, 400)

        for body in ({'tour_id': 6, 'content': 'Hi'}, {'tour_id': 6, 'scheduled_date': 'bad', 'content': 'Hi'}):
            req = self.factory.post('/api/v1/vendors/inbox/messages/', body, format='json')
            force_authenticate(req, user=self.customer)
            resp = VendorTripChatMessagesView.as_view()(req)
            self.assertEqual(resp.status_code, 400)


class VendorWalkInBookingTests(TestCase):
    def setUp(self):
        from apps.tours.models import Tours, TourSchedules
        self.unrelated_customer = Users.objects.create(
            name='Other User', email='other@example.com', role='customer', status='active'
        )
        owner = Users.objects.create(
            name='Vendor Owner', email='owner@example.com', role='vendor_admin', status='active'
        )
        self.vendor = Vendors.objects.create(user=owner, brand_name='Son Tra Co', status='approved')
        self.tour = Tours.objects.create(
            vendor=self.vendor, title='Peak Trail', slug='peak-trail',
            price=450000, duration_hours=3, status='published', max_capacity=5,
        )
        self.dep_date = date(2026, 12, 10)
        self.schedule = TourSchedules.objects.create(
            tour=self.tour, departure_date=self.dep_date, max_capacity=5, price=450000, status='open'
        )

    def test_walkin_booking_uses_walkin_account_sets_date_and_enforces_capacity(self):
        from apps.orders.models import Orders, OrderVendors
        created = VendorService.create_vendor_booking({
            'tour_id': self.tour.id,
            'schedule_id': self.schedule.id,
            'booking_date': '2026-12-10',
            'adults_count': 5,
            'customer_name': 'Khach Le',
            'customer_phone': '0905000111',
            'payment_status': 'paid',
        }, vendor_id=self.vendor.id)

        order = Orders.objects.get(order_code=created['order_code'])
        ov = OrderVendors.objects.get(id=int(created['id']))
        self.assertNotEqual(order.customer_id, self.unrelated_customer.id)
        self.assertEqual(order.customer.email, 'walkin@sontra.internal')
        self.assertEqual(ov.scheduled_date, self.dep_date)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 5)
        self.assertEqual(self.schedule.status, 'full')

        # Creating another booking for the full schedule must fail cleanly
        with self.assertRaisesMessage(ValueError, 'chỗ trống'):
            VendorService.create_vendor_booking({
                'tour_id': self.tour.id,
                'schedule_id': self.schedule.id,
                'adults_count': 1,
                'customer_name': 'Khach Thu 2',
            }, vendor_id=self.vendor.id)

        # Cancelling releases slots; occupying them elsewhere prevents reopening
        VendorService.update_booking_status(ov.id, 'cancelled', vendor_id=self.vendor.id)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)
        self.assertEqual(self.schedule.status, 'open')

        VendorService.create_vendor_booking({
            'tour_id': self.tour.id,
            'schedule_id': self.schedule.id,
            'adults_count': 5,
            'customer_name': 'Khach Moi',
        }, vendor_id=self.vendor.id)
        with self.assertRaisesMessage(ValueError, 'khôi phục'):
            VendorService.update_booking_status(ov.id, 'confirmed', vendor_id=self.vendor.id)


class VendorInboxServiceTests(TestCase):
    def setUp(self):
        from datetime import date
        from apps.accounts.models import Users
        from apps.vendors.models import Vendors, Guides
        from apps.tours.models import Tours, TourSchedules

        self.sched_date = date(2026, 12, 1)

        self.vendor_a_user = Users.objects.create(
            name='Vendor A Owner',
            email='vendora@example.com',
            phone='0900000001',
            role='vendor',
        )
        self.vendor_a = Vendors.objects.create(
            user=self.vendor_a_user,
            brand_name='Brand A',
            status='approved',
        )

        self.guide_user = Users.objects.create(
            name='HDV Phan',
            email='guidephan@example.com',
            phone='0901112223',
            role='guide',
        )
        self.guide = Guides.objects.create(
            vendor=self.vendor_a,
            user=self.guide_user,
        )

        self.tour_a = Tours.objects.create(
            vendor=self.vendor_a,
            title='Cung Đỉnh Bàn Cờ',
            slug='cung-dinh-ban-co-inbox-test',
            price=500000,
            duration_hours=4.5,
            status='published',
        )
        TourSchedules.objects.create(
            tour=self.tour_a,
            guide=self.guide,
            departure_date=self.sched_date,
        )

        self.vendor_b_user = Users.objects.create(
            name='Vendor B Owner',
            email='vendorb@example.com',
            phone='0900000002',
            role='vendor',
        )
        self.vendor_b = Vendors.objects.create(
            user=self.vendor_b_user,
            brand_name='Brand B',
            status='approved',
        )
        self.tour_b = Tours.objects.create(
            vendor=self.vendor_b,
            title='Tour Riêng Vendor B',
            slug='tour-rieng-vendor-b-inbox-test',
            price=400000,
            duration_hours=3.0,
            status='published',
        )

    def test_paid_booking_populates_channels_roster_guests_and_assigned_guide(self):
        from apps.accounts.models import Users
        from apps.orders.models import Orders, OrderVendors, OrderItems

        online_customer = Users.objects.create(
            name='Khách Online',
            email='online@example.com',
            phone='0903334445',
            role='customer',
        )
        walkin_customer = Users.objects.create(
            name='Khách đặt tại quầy',
            email='walkin@sontra.internal',
            phone='0900000099',
            role='customer',
        )

        order_1 = Orders.objects.create(
            customer=online_customer,
            order_code='ORD-INBOX-001',
            grand_total=1500000,
            payment_status='paid',
        )
        ov_1 = OrderVendors.objects.create(
            order=order_1,
            vendor=self.vendor_a,
            scheduled_date=self.sched_date,
            subtotal=1500000,
            status='confirmed',
        )
        OrderItems.objects.create(
            order_vendor=ov_1,
            item_type='tour',
            tour=self.tour_a,
            quantity=3,
            unit_price=500000,
            price_at_sale_time=500000,
        )

        order_2 = Orders.objects.create(
            customer=walkin_customer,
            order_code='ORD-INBOX-002',
            grand_total=1000000,
            payment_status='paid',
            shipping_address={'customer_name': 'Khách Quầy B'},
        )
        ov_2 = OrderVendors.objects.create(
            order=order_2,
            vendor=self.vendor_a,
            scheduled_date=self.sched_date,
            subtotal=1000000,
            status='confirmed',
        )
        OrderItems.objects.create(
            order_vendor=ov_2,
            item_type='tour',
            tour=self.tour_a,
            quantity=2,
            unit_price=500000,
            price_at_sale_time=500000,
        )

        channels = TripChatService.get_trip_channels(vendor_id=self.vendor_a.id)
        self.assertEqual(len(channels), 1)
        ch = channels[0]
        self.assertEqual(ch['tour_id'], self.tour_a.id)
        self.assertEqual(ch['total_guests'], 5)
        self.assertEqual(ch['scheduled_date_formatted'], '01/12/2026')
        self.assertEqual(ch['date_formatted'], '01/12/2026')
        self.assertEqual(ch['guide_name'], 'HDV Phan')
        self.assertEqual(ch['guide_phone'], '0901112223')

        detail = TripChatService.get_trip_messages(self.tour_a.id, '2026-12-01')
        trip_meta = detail['trip']
        self.assertEqual(trip_meta['guide']['name'], 'HDV Phan')
        self.assertEqual(trip_meta['guide']['phone'], '0901112223')
        roster_by_code = {c['order_code']: c for c in trip_meta['customers']}
        self.assertEqual(roster_by_code['ORD-INBOX-001']['name'], 'Khách Online')
        self.assertEqual(roster_by_code['ORD-INBOX-001']['guests_count'], 3)
        self.assertEqual(roster_by_code['ORD-INBOX-002']['name'], 'Khách Quầy B')
        self.assertEqual(roster_by_code['ORD-INBOX-002']['guests_count'], 2)

    def test_unpaid_excluded_and_chat_channels_scoped_by_vendor(self):
        from apps.accounts.models import Users
        from apps.orders.models import Orders, OrderVendors, OrderItems
        from apps.tours.models import TripChatMessages

        customer = Users.objects.create(
            name='Khách Chưa Trả',
            email='unpaid@example.com',
            phone='0907778889',
            role='customer',
        )
        unpaid_order = Orders.objects.create(
            customer=customer,
            order_code='ORD-UNPAID-001',
            grand_total=500000,
            payment_status='pending',
        )
        unpaid_ov = OrderVendors.objects.create(
            order=unpaid_order,
            vendor=self.vendor_a,
            scheduled_date=self.sched_date,
            subtotal=500000,
            status='confirmed',
        )
        OrderItems.objects.create(
            order_vendor=unpaid_ov,
            item_type='tour',
            tour=self.tour_a,
            quantity=2,
            unit_price=500000,
            price_at_sale_time=500000,
        )

        # Vendor B có tin nhắn trong TripChatMessages nhưng không được lộ sang Vendor A
        TripChatMessages.objects.create(
            tour=self.tour_b,
            scheduled_date=self.sched_date,
            sender=self.vendor_b_user,
            content='Tin nhắn nội bộ vendor B',
            message_type='text',
        )

        channels_a = TripChatService.get_trip_channels(vendor_id=self.vendor_a.id)
        self.assertEqual(channels_a, [])

        detail_a = TripChatService.get_trip_messages(self.tour_a.id, '2026-12-01')
        self.assertEqual(detail_a['trip']['customers'], [])


class VendorDashboardReviewOverviewTests(SimpleTestCase):
    def test_dashboard_includes_review_overview_summary_and_recent_reviews(self):
        from datetime import datetime
        vendor = SimpleNamespace(
            id=23,
            brand_name='Son Tra Eco',
            status='approved',
            avg_rating=Decimal('4.50'),
            total_reviews=2,
        )
        tour = SimpleNamespace(
            id=6,
            title='Chinh phục đỉnh Bàn Cờ',
            avg_rating=Decimal('4.50'),
            total_reviews=2,
            status='published',
        )
        rev1 = SimpleNamespace(
            id=101,
            tour_id=6,
            tour=tour,
            guide_id=None,
            guide=None,
            order_vendor_id=11,
            order_vendor=SimpleNamespace(order=SimpleNamespace(order_code='ORD-101')),
            customer=SimpleNamespace(name='Nguyễn Văn An'),
            rating=5,
            comment='Trải nghiệm tuyệt vời!',
            images=[{'type': 'review_meta', 'guide_rating': 5, 'tour_tags': ['Cảnh đẹp']}],
            created_at=datetime(2026, 11, 20, 9, 0),
        )
        rev2 = SimpleNamespace(
            id=102,
            tour_id=6,
            tour=tour,
            guide_id=None,
            guide=None,
            order_vendor_id=12,
            order_vendor=SimpleNamespace(order=SimpleNamespace(order_code='ORD-102')),
            customer=SimpleNamespace(name='Trần Thị Bình'),
            rating=2,
            comment='Khởi hành hơi trễ.',
            images=[{'type': 'review_meta', 'low_rating_reasons': ['Trễ giờ']}],
            created_at=datetime(2026, 11, 19, 8, 30),
        )

        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            vendors = stack.enter_context(patch(module + 'Vendors'))
            tours = stack.enter_context(patch(module + 'Tours'))
            ov_cls = stack.enter_context(patch(module + 'OrderVendors'))
            oi_cls = stack.enter_context(patch(module + 'OrderItems'))
            fin = stack.enter_context(patch(module + 'vendor_finance'))
            reviews_cls = stack.enter_context(patch('apps.gamification.models.gamification_models.Reviews'))

            vendors.objects.get.return_value = vendor
            fin.return_value = (
                {'total_gross_amount': 10000, 'monthly_revenue': 10000, 'previous_month_revenue': 0},
                {'period': '3m', 'data': []},
                {'summary': {'gross_amount': 10000, 'vendor_net_amount': 8500}},
            )
            ov_qs = ov_cls.objects.filter.return_value
            ov_qs.values.return_value.annotate.return_value = []
            ov_qs.filter.return_value.count.return_value = 0
            ov_qs.select_related.return_value.prefetch_related.return_value.order_by.return_value.__getitem__.return_value = []
            oi_cls.objects.filter.return_value.exclude.return_value.exclude.return_value.values.return_value.annotate.return_value = []
            tours.objects.filter.return_value.order_by.return_value = [tour]
            reviews_cls.objects.filter.return_value.select_related.return_value.order_by.return_value = [rev1, rev2]

            result = VendorService.get_vendor_dashboard(23, '3m')

        ro = result['review_overview']
        self.assertEqual(ro['summary']['total_reviews'], 2)
        self.assertEqual(ro['summary']['avg_rating'], 3.5)
        self.assertEqual(ro['summary']['five_star_count'], 1)
        self.assertEqual(ro['summary']['five_star_rate'], 50)
        self.assertEqual(ro['summary']['unreplied_count'], 2)
        self.assertEqual(ro['summary']['low_unreplied_count'], 1)
        self.assertEqual(ro['summary']['rating_breakdown']['5'], 1)
        self.assertEqual(ro['summary']['rating_breakdown']['2'], 1)
        self.assertEqual(len(ro['recent_reviews']), 2)
        self.assertEqual(ro['recent_reviews'][0]['customer_name'], 'Nguyễn V. A.')
        self.assertEqual(ro['recent_reviews'][0]['order_code'], 'ORD-101')
        self.assertEqual(result['quality_alert']['level'], 'attention')

    def test_get_vendor_reviews_lists_guides_and_reviews(self):
        tour = SimpleNamespace(id=6, title='Đỉnh Bàn Cờ', avg_rating=Decimal('5.00'), total_reviews=1)
        guide = SimpleNamespace(id=3, user=SimpleNamespace(name='HDV Minh'))
        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            tours = stack.enter_context(patch(module + 'Tours'))
            guides = stack.enter_context(patch(module + 'Guides'))
            reviews_cls = stack.enter_context(patch('apps.gamification.models.gamification_models.Reviews'))

            tours.objects.filter.return_value.order_by.return_value = [tour]
            guides.objects.filter.return_value.select_related.return_value.order_by.return_value = [guide]
            reviews_cls.objects.filter.return_value.select_related.return_value.order_by.return_value = []

            res = VendorService.get_vendor_reviews(vendor_id=23)

        self.assertEqual(res['guides'], [{'id': 3, 'name': 'HDV Minh'}])
        self.assertEqual(res['tours'], [{'id': 6, 'title': 'Đỉnh Bàn Cờ'}])
        self.assertEqual(res['summary']['total_reviews'], 0)
