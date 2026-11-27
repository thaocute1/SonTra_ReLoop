from contextlib import ExitStack, nullcontext
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from django.db.models import Q
from django.db.models.expressions import CombinedExpression
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from .services.tour_service import TourService
from .views.tour_views import TourBookingCreateView, VendorTourListView


class BookingTests(SimpleTestCase):
    def setUp(self):
        self.customer = SimpleNamespace(
            id=7, is_authenticated=True, is_active=True,
            email='owner@example.com', name='Owner', phone='0901234567',
        )
        self.data = {
            'tour_id': 1, 'schedule_id': 12, 'adults_count': 1,
            'children_count': 0, 'customer_name': 'Contact',
            'customer_phone': '0901234567',
            'customer_email': 'contact@example.com', 'payment_method': 'payos',
        }

    def _make_schedule(self, **overrides):
        defaults = {
            'id': 12,
            'remaining_slots': 10,
            'price': 2000,
            'booked_count': 0,
            'max_capacity': 10,
            'status': 'open',
            'departure_date': timezone.localdate(),
            'start_time': '06:00',
            'end_time': '10:30',
            'save': Mock(),
        }
        defaults.update(overrides)
        return SimpleNamespace(**defaults)

    def _book_with_mocks(self, data, schedule, campaign_item=None):
        tour = SimpleNamespace(id=1, vendor=Mock(), title='Test tour', price=2000)
        module = 'apps.tours.services.tour_service.'
        with ExitStack() as stack:
            tours = stack.enter_context(patch(module + 'Tours'))
            schedules = stack.enter_context(patch(module + 'TourSchedules'))
            orders = stack.enter_context(patch(module + 'Orders'))
            stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'OrderItems'))
            stack.enter_context(patch(module + 'TourParticipants'))
            stack.enter_context(patch(module + 'LedgerEntries'))
            atomic = stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            campaign_items = stack.enter_context(patch('apps.flash_sales.models.CampaignItems'))
            stack.enter_context(patch(
                'apps.payments.services.payos_service.PayOSService.create_payment_link',
                return_value={'status': 'error'},
            ))
            tours.objects.select_related.return_value.filter.return_value.first.return_value = tour
            schedules.objects.select_for_update.return_value.filter.return_value.first.return_value = schedule
            campaign_items.objects.select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = campaign_item
            orders.objects.create.return_value = SimpleNamespace(id=3, order_code='TEST')
            result = TourService.book_tour_slot(data, customer=self.customer)
        return result, schedules, orders, campaign_items, atomic

    def test_view_passes_authenticated_customer(self):
        request = APIRequestFactory().post('/', self.data, format='json')
        force_authenticate(request, user=self.customer)
        with patch.object(TourService, 'book_tour_slot', return_value={
            'order_code': 'TEST', 'order_id': 1,
        }) as book:
            response = TourBookingCreateView.as_view()(request)
        self.assertEqual(response.status_code, 201)
        self.assertIs(book.call_args.kwargs['customer'], self.customer)

    def test_service_uses_authenticated_owner_and_keeps_payment_pending(self):
        schedule = self._make_schedule()
        result, schedules, orders, _, atomic = self._book_with_mocks(self.data, schedule)
        atomic.assert_called_once()
        schedules.objects.select_for_update.assert_called_once()
        self.assertIs(orders.objects.create.call_args.kwargs['customer'], self.customer)
        self.assertEqual(result['customer_email'], 'contact@example.com')
        self.assertEqual(result['payment_status'], 'pending')
        self.assertEqual(result['status'], 'waiting_payment')
        self.assertEqual(schedule.booked_count, 1)

    def test_service_rejects_closed_schedule(self):
        schedule = self._make_schedule(status='full', remaining_slots=0)
        with self.assertRaisesMessage(ValueError, 'không còn mở nhận đặt chỗ'):
            self._book_with_mocks(self.data, schedule)

    def test_service_rejects_overbooked_schedule_after_lock(self):
        schedule = self._make_schedule(remaining_slots=1)
        data = {**self.data, 'adults_count': 2}
        with self.assertRaisesMessage(ValueError, 'không đủ cho đoàn 2 khách'):
            self._book_with_mocks(data, schedule)

    def test_service_rejects_flash_sale_exhausted_after_lock(self):
        now = timezone.now()
        schedule = self._make_schedule()
        campaign_item = SimpleNamespace(
            id=5, tour_id=1, status='approved', promo_price=1200,
            slot_quantity=5, sold_quantity=5,
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'campaign_item_id': 5}
        with self.assertRaisesMessage(ValueError, 'Flash Sale chỉ còn lại 0 vé'):
            self._book_with_mocks(data, schedule, campaign_item=campaign_item)

    def test_service_rejects_expired_flash_sale_session(self):
        now = timezone.now()
        schedule = self._make_schedule()
        campaign_item = SimpleNamespace(
            id=5, tour_id=1, status='approved', promo_price=1200,
            slot_quantity=5, sold_quantity=0,
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=3),
                end_time=now - timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'campaign_item_id': 5}
        with self.assertRaisesMessage(ValueError, 'chưa bắt đầu hoặc đã kết thúc'):
            self._book_with_mocks(data, schedule, campaign_item=campaign_item)

    def test_service_rejects_mismatched_flash_sale_tour(self):
        now = timezone.now()
        schedule = self._make_schedule()
        campaign_item = SimpleNamespace(
            id=5, tour_id=999, status='approved', promo_price=1200,
            slot_quantity=5, sold_quantity=0,
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'campaign_item_id': 5}
        with self.assertRaisesMessage(ValueError, 'Flash Sale không hợp lệ'):
            self._book_with_mocks(data, schedule, campaign_item=campaign_item)

    def test_service_updates_flash_sale_atomically_with_f_expression(self):
        now = timezone.now()
        schedule = self._make_schedule()
        campaign_item = SimpleNamespace(
            id=5, tour_id=1, status='approved', promo_price=1200,
            slot_quantity=5, sold_quantity=2,
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'adults_count': 2, 'campaign_item_id': 5}
        result, _, _, _, _ = self._book_with_mocks(data, schedule, campaign_item=campaign_item)
        self.assertIsInstance(campaign_item.sold_quantity, CombinedExpression)
        campaign_item.save.assert_called_once_with(update_fields=['sold_quantity', 'updated_at'])
        campaign_item.refresh_from_db.assert_called_once()
        self.assertEqual(result['total_price'], 2400)

    def test_service_calculates_split_tier_flash_sale_booking(self):
        now = timezone.now()
        schedule = self._make_schedule(remaining_slots=5)
        campaign_item = SimpleNamespace(
            id=5, tour_id=1, status='approved', promo_price=300000,
            slot_quantity=8, sold_quantity=2,
            price_tiers=[
                {'tier_index': 1, 'label': 'Bậc 1', 'quantity': 3, 'price': 300000},
                {'tier_index': 2, 'label': 'Bậc 2', 'quantity': 5, 'price': 380000},
            ],
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'adults_count': 2, 'campaign_item_id': 5, 'expected_total_price': 680000}
        result, _, _, _, _ = self._book_with_mocks(data, schedule, campaign_item=campaign_item)
        self.assertEqual(result['total_price'], 680000)
        self.assertEqual(len(result['flash_sale_breakdown']), 2)
        self.assertEqual(result['flash_sale_breakdown'][0]['unit_price'], 300000)
        self.assertEqual(result['flash_sale_breakdown'][1]['unit_price'], 380000)

    def test_service_raises_price_changed_conflict_when_expected_price_stale(self):
        from apps.flash_sales.services.pricing import FlashSalePriceChangedError

        now = timezone.now()
        schedule = self._make_schedule(remaining_slots=5)
        campaign_item = SimpleNamespace(
            id=5, tour_id=1, status='approved', promo_price=300000,
            slot_quantity=8, sold_quantity=2,
            price_tiers=[
                {'tier_index': 1, 'label': 'Bậc 1', 'quantity': 3, 'price': 300000},
                {'tier_index': 2, 'label': 'Bậc 2', 'quantity': 5, 'price': 380000},
            ],
            session=SimpleNamespace(
                status='active',
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                campaign=SimpleNamespace(status='active'),
            ),
            save=Mock(), refresh_from_db=Mock(),
        )
        data = {**self.data, 'adults_count': 2, 'campaign_item_id': 5, 'expected_total_price': 600000}
        with self.assertRaises(FlashSalePriceChangedError) as ctx:
            self._book_with_mocks(data, schedule, campaign_item=campaign_item)
        self.assertEqual(ctx.exception.code, 'FLASH_SALE_PRICE_CHANGED')
        self.assertEqual(ctx.exception.payload['new_total_price'], 680000)
        self.assertEqual(len(ctx.exception.payload['breakdown']), 2)
        campaign_item.save.assert_not_called()

    def test_booking_view_returns_409_conflict_on_flash_sale_price_change(self):
        from apps.flash_sales.services.pricing import FlashSalePriceChangedError

        factory = APIRequestFactory()
        request = factory.post(
            '/api/v1/orders/booking/',
            {**self.data, 'adults_count': 2, 'campaign_item_id': 5, 'expected_total_price': 600000},
            format='json',
        )
        force_authenticate(request, user=self.customer)
        err = FlashSalePriceChangedError(
            'Giá mới là 680.000 đ.',
            payload={'new_total_price': 680000, 'breakdown': []},
        )
        with patch.object(TourService, 'book_tour_slot', side_effect=err):
            response = TourBookingCreateView.as_view()(request)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'FLASH_SALE_PRICE_CHANGED')
        self.assertEqual(response.data['data']['new_total_price'], 680000)

    def test_service_rejects_missing_customer(self):
        with self.assertRaisesMessage(ValueError, 'đăng nhập lại'):
            TourService.book_tour_slot(self.data, customer=None)


class VendorTourSecurityTests(SimpleTestCase):
    def test_vendor_tour_list_requires_auth_and_scopes_to_vendor(self):
        factory = APIRequestFactory()
        anon_req = factory.get('/api/v1/vendors/tours/')
        self.assertIn(VendorTourListView.as_view()(anon_req).status_code, (401, 403))

        customer = SimpleNamespace(id=3, role='customer', is_authenticated=True)
        cust_req = factory.get('/api/v1/vendors/tours/')
        force_authenticate(cust_req, user=customer)
        self.assertEqual(VendorTourListView.as_view()(cust_req).status_code, 403)

        vendor_user = SimpleNamespace(id=17, role='vendor_admin', is_authenticated=True)
        vendor_req = factory.get('/api/v1/vendors/tours/', {'vendor_id': 999})
        force_authenticate(vendor_req, user=vendor_user)
        with patch('apps.tours.views.tour_views.Vendors.objects.filter') as v_filter, \
             patch.object(TourService, 'get_vendor_tours', return_value=[]) as get_tours:
            v_filter.return_value.first.return_value = SimpleNamespace(id=23)
            res = VendorTourListView.as_view()(vendor_req)
        self.assertEqual(res.status_code, 200)
        get_tours.assert_called_once_with(23)

    def test_create_vendor_tour_starts_as_pending_approval(self):
        module = 'apps.tours.services.tour_service.'
        with ExitStack() as stack:
            vendors = stack.enter_context(patch(module + 'Vendors'))
            tours = stack.enter_context(patch(module + 'Tours'))
            routes = stack.enter_context(patch(module + 'Routes'))
            stack.enter_context(patch(module + 'Checkpoints'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch.object(TourService, '_format_tour_from_db', return_value={'id': 1, 'title': 'T', 'status': 'pending_approval'}))

            vendors.objects.filter.return_value.first.return_value = SimpleNamespace(id=23)
            tours.objects.create.return_value = SimpleNamespace(id=1)
            routes.objects.create.return_value = SimpleNamespace(id=2)

            TourService.create_vendor_tour(23, {'title': 'Son Tra Trail'})
            self.assertEqual(tours.objects.create.call_args.kwargs['status'], 'pending_approval')


class BookingPrivacyAndLedgerTests(SimpleTestCase):
    def test_book_tour_slot_does_not_create_ledger_entry_while_pending(self):
        customer = SimpleNamespace(
            id=7, is_authenticated=True, is_active=True,
            email='owner@example.com', name='Owner', phone='0901234567',
        )
        schedule = SimpleNamespace(
            id=12, remaining_slots=10, price=2000, booked_count=0,
            max_capacity=10, status='open', departure_date=timezone.localdate(),
            start_time='06:00', end_time='10:30', save=Mock(),
        )
        tour = SimpleNamespace(id=1, vendor=Mock(), title='Test tour', price=2000)
        module = 'apps.tours.services.tour_service.'
        with ExitStack() as stack:
            tours = stack.enter_context(patch(module + 'Tours'))
            schedules = stack.enter_context(patch(module + 'TourSchedules'))
            orders = stack.enter_context(patch(module + 'Orders'))
            stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'OrderItems'))
            stack.enter_context(patch(module + 'TourParticipants'))
            ledger = stack.enter_context(patch(module + 'LedgerEntries'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(
                'apps.payments.services.payos_service.PayOSService.create_payment_link',
                return_value={'status': 'error'},
            ))
            tours.objects.select_related.return_value.filter.return_value.first.return_value = tour
            schedules.objects.select_for_update.return_value.filter.return_value.first.return_value = schedule
            orders.objects.create.return_value = SimpleNamespace(id=3, order_code='TEST')

            TourService.book_tour_slot(
                {'tour_id': 1, 'schedule_id': 12, 'adults_count': 1, 'customer_email': 'victim@example.com'},
                customer=customer,
            )

        ledger.objects.create.assert_not_called()

    def test_get_customer_bookings_filters_only_by_owning_customer_not_shipping_email(self):
        user = SimpleNamespace(id=77, email='victim@example.com', is_authenticated=True)
        mock_qs = MagicMock()
        mock_qs.select_related.return_value = mock_qs
        mock_qs.prefetch_related.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.distinct.return_value = mock_qs
        mock_qs.order_by.return_value = mock_qs
        mock_qs.__iter__.return_value = iter([])

        with patch('apps.tours.services.tour_service.OrderVendors.objects', mock_qs):
            TourService.get_customer_bookings(user=user)

        second_filter_arg = mock_qs.filter.call_args_list[1].args[0]
        self.assertEqual(second_filter_arg.children, [('order__customer', user)])
        self.assertNotIn('customer_email', repr(second_filter_arg))


class RemainingFixesIntegrationTests(SimpleTestCase):
    def test_public_tour_list_allows_anonymous_access(self):
        from .views.tour_views import PublicTourListView
        req = APIRequestFactory().get('/api/v1/tours/')
        with patch.object(TourService, 'get_published_tours', return_value=[]):
            resp = PublicTourListView.as_view()(req)
        self.assertEqual(resp.status_code, 200)


class VendorCrudReviewsAndStaffStatsDbTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from apps.accounts.models.user_models import Users
        from apps.accounts.services.token_service import TokenService
        from apps.vendors.models import Vendors
        from apps.tours.models import Tours, TourSchedules
        from apps.orders.models import Orders, OrderVendors, OrderItems

        self.client = APIClient()
        self.vendor_user = Users.objects.create(name='Vendor CRUD', role='vendor_admin', email='vcrud@test.local')
        self.customer = Users.objects.create(name='Customer QA', role='customer', email='cqa@test.local', total_eco_points=300)
        self.staff = Users.objects.create(name='Staff QA', role='staff', email='sqa@test.local')
        self.vendor = Vendors.objects.create(user=self.vendor_user, brand_name='Son Tra Co', status='approved')
        self.tour = Tours.objects.create(
            vendor=self.vendor, title='Original Trail', slug='orig-trail',
            price=400000, duration_hours=3, status='published', max_capacity=10,
        )
        self.schedule = TourSchedules.objects.create(
            tour=self.tour, departure_date=timezone.localdate() + timedelta(days=3),
            max_capacity=10, price=400000, status='open',
        )
        self.order = Orders.objects.create(customer=self.customer, order_code='ORD-REV-1', grand_total=400000, payment_status='paid')
        self.ov = OrderVendors.objects.create(
            order=self.order, vendor=self.vendor, scheduled_date=timezone.localdate(),
            subtotal=400000, status='completed',
        )
        OrderItems.objects.create(
            order_vendor=self.ov, item_type='tour', tour=self.tour,
            tour_schedule=self.schedule, quantity=1, unit_price=400000, price_at_sale_time=400000,
        )
        self.vendor_token = TokenService.generate_tokens_for_user(self.vendor_user)['access']
        self.cust_token = TokenService.generate_tokens_for_user(self.customer)['access']
        self.staff_token = TokenService.generate_tokens_for_user(self.staff)['access']

    def test_vendor_can_update_suspend_resume_and_cannot_delete_published_tour(self):
        from apps.tours.models import Tours
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.vendor_token)
        patch_resp = self.client.patch(f'/api/v1/vendors/tours/{self.tour.id}/', {'title': 'Updated Trail', 'price': 450000}, format='json')
        self.assertEqual(patch_resp.status_code, 200)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.title, 'Updated Trail')

        # Published / booked tour cannot be deleted, must use suspend/resume instead
        blocked_del = self.client.delete(f'/api/v1/vendors/tours/{self.tour.id}/')
        self.assertEqual(blocked_del.status_code, 400)

        suspend_resp = self.client.patch(f'/api/v1/vendors/tours/{self.tour.id}/', {'action': 'suspend'}, format='json')
        self.assertEqual(suspend_resp.status_code, 200)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'suspended')

        resume_resp = self.client.patch(f'/api/v1/vendors/tours/{self.tour.id}/', {'action': 'resume'}, format='json')
        self.assertEqual(resume_resp.status_code, 200)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'published')

        # Unbooked draft tour can be soft-deleted
        draft_tour = Tours.objects.create(
            vendor=self.vendor, title='Draft Trail', slug='draft-trail',
            price=300000, duration_hours=2, status='pending_approval',
        )
        del_resp = self.client.delete(f'/api/v1/vendors/tours/{draft_tour.id}/')
        self.assertEqual(del_resp.status_code, 200)
        draft_tour.refresh_from_db()
        self.assertIsNotNone(draft_tour.deleted_at)

    def test_customer_must_complete_booking_before_reviewing_and_earns_points(self):
        from apps.orders.models import Orders, OrderVendors, OrderItems
        from apps.gamification.models.gamification_models import PointsLedger

        order2 = Orders.objects.create(customer=self.customer, order_code='ORD-REV-2', grand_total=400000, payment_status='paid')
        ov2 = OrderVendors.objects.create(
            order=order2, vendor=self.vendor, scheduled_date=timezone.localdate(),
            subtotal=400000, status='confirmed',
        )
        OrderItems.objects.create(
            order_vendor=ov2, item_type='tour', tour=self.tour,
            tour_schedule=self.schedule, quantity=1, unit_price=400000, price_at_sale_time=400000,
        )

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.cust_token)
        # Confirmed but not yet completed -> review blocked
        early_resp = self.client.post(
            f'/api/v1/tours/{self.tour.id}/reviews/',
            {'order_vendor_id': ov2.id, 'rating': 5, 'comment': 'Chưa đi xong'},
            format='json',
        )
        self.assertEqual(early_resp.status_code, 400)

        # Complete booking -> then review succeeds and awards +10 RE-Points
        comp_resp = self.client.post(f'/api/v1/tours/my-bookings/{ov2.id}/complete/')
        self.assertEqual(comp_resp.status_code, 200)
        ov2.refresh_from_db()
        self.assertEqual(ov2.status, 'completed')

        post_resp = self.client.post(
            f'/api/v1/tours/{self.tour.id}/reviews/',
            {'order_vendor_id': ov2.id, 'rating': 5, 'comment': 'Rất tuyệt vời!'},
            format='json',
        )
        self.assertEqual(post_resp.status_code, 201)
        self.assertEqual(post_resp.data['data']['points_awarded'], 10)
        self.assertTrue(PointsLedger.objects.filter(user=self.customer, reference_type='tour_review_reward', order_vendor=ov2).exists())
        self.tour.refresh_from_db()
        self.assertEqual(float(self.tour.avg_rating), 5.0)
        self.assertEqual(self.tour.total_reviews, 1)

        dup_resp = self.client.post(
            f'/api/v1/tours/{self.tour.id}/reviews/',
            {'order_vendor_id': ov2.id, 'rating': 4, 'comment': 'Duplicate'},
            format='json',
        )
        self.assertEqual(dup_resp.status_code, 400)

        self.client.credentials()
        get_resp = self.client.get(f'/api/v1/tours/{self.tour.id}/reviews/')
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(len(get_resp.data['data']['results']), 1)

    def test_staff_dashboard_stats_requires_staff_and_returns_real_counts(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.cust_token)
        self.assertEqual(self.client.get('/api/v1/challenging/staff/dashboard-stats/').status_code, 403)

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.staff_token)
        resp = self.client.get('/api/v1/challenging/staff/dashboard-stats/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('pending_trash_count', resp.data['data'])
        self.assertIn('pending_incidents_count', resp.data['data'])
        self.assertIn('processed_today_count', resp.data['data'])

    def test_tour_create_serializer_accepts_expert_difficulty(self):
        from .serializers.tour_serializers import TourCreateSerializer
        ser = TourCreateSerializer(data={
            'title': 'Cung mạo hiểm',
            'price': '650000',
            'difficulty_level': 'expert',
        })
        self.assertTrue(ser.is_valid(), ser.errors)
