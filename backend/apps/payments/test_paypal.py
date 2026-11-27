from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models.user_models import Users
from apps.accounts.models.notification_models import Notifications
from apps.vendors.models import Vendors
from apps.tours.models import Tours, TourSchedules
from apps.tours.models.tour_models import TourParticipants
from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.tours.services.tour_service import TourService
from apps.challenging.models.challenge_models import Challenges, ChallengeAttempts
from apps.orders.models import Orders, OrderVendors
from apps.payments.models import PaymentTransactions, LedgerEntries
from apps.payments.services.paypal_client import PayPalClient, PayPalError
from apps.payments.services import paypal_service
from apps.payments.views.paypal_views import PayPalCreateOrderView, PayPalCaptureView, PayPalStatusView, PayPalWebhookView
from apps.payments.views.payos_views import confirm_order_payment


class PayPalTests(TestCase):
    def setUp(self):
        self.env = patch.dict('os.environ', {'PAYPAL_MODE': 'sandbox', 'PAYPAL_CLIENT_ID': 'test-id',
                                            'PAYPAL_CLIENT_SECRET': 'test-secret', 'PAYPAL_DEMO_VND_PER_USD': '25000',
                                            'PAYPAL_FRONTEND_URL': 'http://localhost:5173'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.customer = Users.objects.create(name='Buyer QA', role='customer')
        self.other = Users.objects.create(name='Other buyer QA', role='customer')
        owner = Users.objects.create(name='Vendor QA', role='vendor_admin')
        self.vendor = Vendors.objects.create(user=owner, brand_name='Vendor QA', status='approved')
        self.tour = Tours.objects.create(vendor=self.vendor, title='Tour QA', slug='tour-qa', price=450000, duration_hours=2, status='published')
        self.schedule = TourSchedules.objects.create(tour=self.tour, departure_date=timezone.localdate() + timedelta(days=1), max_capacity=5, price=450000)
        self.booking = {'tour_id': self.tour.id, 'schedule_id': self.schedule.id, 'adults_count': 1,
                        'customer_name': 'Buyer QA', 'customer_phone': '0901234567', 'payment_method': 'paypal'}

    def book(self):
        return TourService.book_tour_slot(self.booking, customer=self.customer)

    def checkout(self):
        result = self.book()
        created = {'id': 'PPORDER01', 'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
                   'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}]}
        with patch.object(PayPalClient, 'create', return_value=created) as call:
            result = paypal_service.create_checkout(self.customer, result['order_id'])
        self.assertEqual(call.call_count, 1)
        return result, PaymentTransactions.objects.get(payment_gateway='paypal')

    def provider(self, payment, status='COMPLETED', capture_status='COMPLETED', amount='18.00', currency='USD'):
        return {'id': 'PPORDER01', 'status': status, 'purchase_units': [{
            'reference_id': str(payment.order_id), 'custom_id': str(payment.order_id), 'payee': {'merchant_id': 'SELLER01'},
            'payments': {'captures': [{'id': 'CAPTURE01', 'status': capture_status,
                                       'amount': {'value': amount, 'currency_code': currency}}]} if status == 'COMPLETED' else {},
        }]}

    def request(self, view, method='post', data=None, user=None, **extra):
        request = getattr(APIRequestFactory(), method)('/api/test/', data or {}, format='json', **extra)
        if user is not None:
            force_authenticate(request, user=user)
        return view.as_view()(request)

    def test_paypal_booking_has_hold_but_no_payos_call_or_unpaid_ledger(self):
        with patch('apps.payments.services.payos_service.PayOSService.create_payment_link') as payos:
            result = self.book()
        payos.assert_not_called()
        self.assertEqual(LedgerEntries.objects.count(), 0)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 1)
        self.assertIsNotNone(Orders.objects.get(pk=result['order_id']).expires_at)

    def test_paypal_reuses_participants_and_authenticated_booking_owner(self):
        self.booking.update(customer_email='contact@example.com', participants=[{
            'full_name': 'Guest QA', 'phone': '0901234567',
            'emergency_contact_name': 'Emergency QA', 'emergency_contact_phone': '0907654321',
        }])
        result = self.book()
        order = Orders.objects.get(pk=result['order_id'])
        participant = TourParticipants.objects.get(order_item__order_vendor__order=order)
        self.assertEqual(order.customer_id, self.customer.id)
        self.assertEqual(order.shipping_address['customer_email'], 'contact@example.com')
        self.assertEqual(participant.full_name, 'Guest QA')
        self.assertEqual(participant.emergency_contact_name, 'Emergency QA')
        self.assertEqual(result['schedule_id'], str(self.schedule.id))
        with patch('apps.payments.views.payos_views.sync_pending_payos_transactions'):
            self.assertEqual(TourService.get_customer_bookings(user=self.other), [])

    def test_paypal_rejects_invalid_guest_count_and_full_schedule_without_reserving(self):
        for adults, children in [(0, 0), (1, -1), (6, 0)]:
            with self.subTest(adults=adults, children=children), self.assertRaises(ValueError):
                TourService.book_tour_slot({**self.booking, 'adults_count': adults, 'children_count': children}, customer=self.customer)
        self.schedule.status = 'full'
        self.schedule.save(update_fields=['status'])
        with self.assertRaises(ValueError):
            self.book()
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)

    def test_paypal_refund_request_and_admin_approval_restores_slot_points_and_excludes_from_fund(self):
        from apps.gamification.models.gamification_models import PointsLedger
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import (
            RefundAdminListView,
            RefundProcessAdminView,
            _get_conservation_fund_totals,
        )
        from apps.payments.services.admin_payout_service import payout_overview

        self.customer.total_eco_points = 500
        self.customer.save(update_fields=['total_eco_points'])
        booking_res = TourService.book_tour_slot(
            {**self.booking, 'use_points_discount': True},
            customer=self.customer,
        )
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        usd = payment.raw_response['amount_usd']
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, amount=usd)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Thay đổi lịch trình'}, format='json')
        force_authenticate(req, user=self.customer)
        resp = CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id)
        self.assertEqual(resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'requested')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'on_hold')
        self.assertEqual(payout_overview()['pending_payouts'], [])

        admin = Users.objects.create(name='BQL Admin', role='system_admin')
        list_resp = self.request(RefundAdminListView, method='get', user=admin)
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(list_resp.data['pending_count'], 1)

        with patch.object(
            PayPalClient,
            'refund_capture',
            return_value={'id': 'PPREFUND01', 'status': 'COMPLETED'},
        ) as refund_call:
            proc_req = APIRequestFactory().post('/', {'decision': 'approve', 'admin_note': 'OK'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        refund_call.assert_called_once()
        self.assertEqual(refund_call.call_args.kwargs['capture_id'], 'CAPTURE01')
        ov.refresh_from_db()
        self.assertEqual(ov.status, 'cancelled')
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.refunded_amount, ov.subtotal)
        self.assertEqual(Orders.objects.get(pk=ov.order_id).payment_status, 'refunded')
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)
        self.assertEqual(
            PointsLedger.objects.filter(
                user=self.customer, reference_type='booking_points_refund', points_change=200
            ).count(),
            1,
        )
        total_fund, _, _ = _get_conservation_fund_totals()
        self.assertEqual(total_fund, Decimal('250000000.00'))

    def test_payos_refund_request_requires_bank_info_and_uses_mock_payout(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        res = TourService.book_tour_slot(
            {**self.booking, 'payment_method': 'payos'},
            customer=self.customer,
        )
        pt = PaymentTransactions.objects.create(
            order_id=res['order_id'],
            payment_gateway='payos',
            transaction_code='998877',
            amount=450000,
            status='pending',
        )
        confirm_order_payment(pt.transaction_code, {'status': 'PAID', 'code': '00', 'amount': 450000})
        ov = OrderVendors.objects.get(order_id=res['order_id'])

        # Missing bank info -> 400
        bad_req = APIRequestFactory().post('/', {'reason': 'Bận đột xuất'}, format='json')
        force_authenticate(bad_req, user=self.customer)
        bad_resp = CustomerTourBookingRefundRequestView.as_view()(bad_req, booking_id=ov.id)
        self.assertEqual(bad_resp.status_code, 400)

        good_req = APIRequestFactory().post(
            '/',
            {
                'reason': 'Bận đột xuất',
                'bank_bin': '970422',
                'bank_name': 'MB Bank',
                'account_number': '0979520852',
                'account_holder': 'NGUYEN TUAN PHONG',
            },
            format='json',
        )
        force_authenticate(good_req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(good_req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 2', role='system_admin')
        with patch.dict('os.environ', {'PAYOS_PAYOUT_MODE': 'mock'}):
            proc_req = APIRequestFactory().post('/', {'decision': 'approve'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        self.assertEqual(proc_resp.data['provider_mode'], 'payos_mock')
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.status, 'cancelled')

    def test_admin_reject_refund_restores_ledger_to_recorded(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        booking_res = self.book()
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Muốn hoàn'}, format='json')
        force_authenticate(req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 3', role='system_admin')
        proc_req = APIRequestFactory().post('/', {'decision': 'reject', 'admin_note': 'Quá hạn hủy'}, format='json')
        force_authenticate(proc_req, user=admin)
        proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)
        self.assertEqual(proc_resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'rejected')
        self.assertEqual(ov.status, 'confirmed')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'recorded')
        self.assertEqual(Orders.objects.count(), 0)
        self.assertEqual(TourParticipants.objects.count(), 0)

    def test_paypal_flash_sale_last_slot_and_cancel_keep_existing_stock_rules(self):
        now = timezone.now()
        campaign = Campaigns.objects.create(title='Sale QA', registration_deadline=now, status='active')
        session = CampaignSessions.objects.create(campaign=campaign, session_name='Session QA',
                                                  start_time=now - timedelta(hours=1), end_time=now + timedelta(hours=1), status='active')
        item = CampaignItems.objects.create(session=session, vendor=self.vendor, tour=self.tour,
                                             promo_price=400000, slot_quantity=1, status='approved')
        self.booking['campaign_item_id'] = item.id
        _, payment = self.checkout()
        self.assertEqual(payment.amount, Decimal('400000'))
        with self.assertRaisesMessage(ValueError, 'Flash Sale chỉ còn lại 0 vé'):
            self.book()
        self.assertEqual(Orders.objects.count(), 1)
        self.assertEqual(LedgerEntries.objects.count(), 0)
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, status='CREATED')):
            paypal_service.cancel_checkout(self.customer, payment.order_id)
            paypal_service.cancel_checkout(self.customer, payment.order_id)
        item.refresh_from_db()
        self.schedule.refresh_from_db()
        self.assertEqual(item.sold_quantity, 0)
        self.assertEqual(self.schedule.booked_count, 0)

    def test_paypal_capture_after_payos_payment_requires_review_without_duplicate_ledger(self):
        _, payment = self.checkout()
        payos = PaymentTransactions.objects.create(order_id=payment.order_id, payment_gateway='payos',
                                                   transaction_code='12345', amount=450000)
        confirm_order_payment(payos.transaction_code, {'code': '00', 'amount': 450000})
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            result = paypal_service.capture_checkout(self.customer, 'PPORDER01')
        self.assertTrue(result['needs_review'])
        self.assertEqual(LedgerEntries.objects.count(), 1)
        self.assertEqual(OrderVendors.objects.get(order_id=payment.order_id).status, 'confirmed')

    def test_create_reuses_checkout_and_freezes_rate(self):
        result, payment = self.checkout()
        with patch.dict('os.environ', {'PAYPAL_DEMO_VND_PER_USD': '30000'}), patch.object(PayPalClient, 'create') as create:
            again = paypal_service.create_checkout(self.customer, payment.order_id)
        create.assert_not_called()
        self.assertEqual(again['amount_usd'], '18.00')
        self.assertEqual(again['fx_vnd_per_usd'], '25000')
        self.assertEqual(PaymentTransactions.objects.count(), 1)
        self.assertEqual(payment.amount, Decimal('450000'))

    def test_timeout_create_retries_with_same_request_id(self):
        result = self.book()
        with patch.object(PayPalClient, 'create', side_effect=PayPalError('timeout')) as create:
            for _ in range(2):
                response = self.request(PayPalCreateOrderView, data={'order_id': result['order_id']}, user=self.customer)
                self.assertEqual(response.status_code, 502)
        self.assertEqual(create.call_args_list[0].args[1], create.call_args_list[1].args[1])
        self.assertEqual(PaymentTransactions.objects.count(), 1)

    def test_invalid_approval_host_is_rejected(self):
        result = self.book()
        with patch.object(PayPalClient, 'create', return_value={'id': 'PPORDER01', 'links': [{'rel': 'approve', 'href': 'https://evil.example/'}]}):
            self.assertEqual(self.request(PayPalCreateOrderView, data={'order_id': result['order_id']}, user=self.customer).status_code, 502)

    def test_capture_confirms_once_and_assigns_mission_once(self):
        _, payment = self.checkout()
        Challenges.objects.create(tour=self.tour, vendor=self.vendor, title='Mission QA', badge_name='QA', badge_icon_url='',
                                  scope='tour', is_required=True, approval_status='approved')
        approved = self.provider(payment, status='APPROVED')
        completed = self.provider(payment)
        with patch.object(PayPalClient, 'details', side_effect=[approved, completed]), patch.object(PayPalClient, 'capture', return_value=completed) as capture:
            result = paypal_service.capture_checkout(self.customer, 'PPORDER01')
            again = paypal_service.capture_checkout(self.customer, 'PPORDER01')
        self.assertEqual(result['payment_status'], 'paid')
        self.assertEqual(again['payment_status'], 'paid')
        self.assertEqual(capture.call_count, 1)
        self.assertEqual(LedgerEntries.objects.count(), 1)
        ledger = LedgerEntries.objects.get()
        self.assertEqual(ledger.conservation_fund, 45000)
        self.assertEqual(ledger.vendor_net_amount, 382500)
        self.assertEqual(ChallengeAttempts.objects.count(), 1)
        self.assertEqual(Notifications.objects.count(), 1)
        self.assertEqual(OrderVendors.objects.get(order_id=payment.order_id).status, 'confirmed')

    def test_capture_network_timeout_recovers_without_charging_again(self):
        _, payment = self.checkout()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, status='APPROVED')), patch.object(PayPalClient, 'capture', side_effect=PayPalError()):
            self.assertEqual(self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer).status_code, 502)
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)), patch.object(PayPalClient, 'capture') as capture:
            result = paypal_service.capture_checkout(self.customer, 'PPORDER01')
        capture.assert_not_called()
        self.assertEqual(result['payment_status'], 'paid')

    def test_amount_currency_reference_and_merchant_must_match(self):
        _, payment = self.checkout()
        cases = [self.provider(payment, amount='17.00'), self.provider(payment, currency='EUR')]
        wrong = self.provider(payment)
        wrong['purchase_units'][0]['custom_id'] = '999'
        cases.append(wrong)
        wrong = self.provider(payment)
        wrong['purchase_units'][0]['payee']['merchant_id'] = 'OTHER'
        cases.append(wrong)
        for body in cases:
            with self.subTest(body=body), patch.object(PayPalClient, 'details', return_value=body):
                response = self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)
                self.assertEqual(response.status_code, 502)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'pending')
        self.assertEqual(LedgerEntries.objects.count(), 0)

    def test_approval_alone_and_pending_capture_do_not_fulfill(self):
        _, payment = self.checkout()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, status='CREATED')), patch.object(PayPalClient, 'capture') as capture:
            self.assertEqual(self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer).status_code, 400)
            capture.assert_not_called()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, capture_status='PENDING')):
            self.assertEqual(paypal_service.capture_checkout(self.customer, 'PPORDER01')['payment_status'], 'pending')
        self.assertEqual(LedgerEntries.objects.count(), 0)

    def test_no_capture_after_hold_expires(self):
        _, payment = self.checkout()
        Orders.objects.filter(pk=payment.order_id).update(expires_at=timezone.now() - timedelta(seconds=1))
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, status='APPROVED')), patch.object(PayPalClient, 'capture') as capture:
            self.assertEqual(self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer).status_code, 400)
            capture.assert_not_called()

    def test_late_money_is_flagged_and_never_confirms_cancelled_seats(self):
        _, payment = self.checkout()
        OrderVendors.objects.filter(order_id=payment.order_id).update(status='cancelled')
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            result = paypal_service.capture_checkout(self.customer, 'PPORDER01')
        self.assertEqual(result['payment_status'], 'paid')
        self.assertTrue(result['needs_review'])
        self.assertEqual(OrderVendors.objects.get(order_id=payment.order_id).status, 'cancelled')
        self.assertEqual(LedgerEntries.objects.count(), 0)

    def test_owner_auth_and_input_validation(self):
        _, payment = self.checkout()
        for view, data in [(PayPalCreateOrderView, {'order_id': payment.order_id}), (PayPalCaptureView, {'paypal_order_id': 'PPORDER01'})]:
            self.assertEqual(self.request(view, data=data).status_code, 401)
            self.assertEqual(self.request(view, data=data, user=self.other).status_code, 404)
        for token in ['../etc/passwd', '', 'x' * 100]:
            self.assertEqual(self.request(PayPalCaptureView, data={'paypal_order_id': token}, user=self.customer).status_code, 400)

    def test_status_recovers_capture_after_browser_closed(self):
        _, payment = self.checkout()
        request = APIRequestFactory().get('/api/test/')
        force_authenticate(request, user=self.customer)
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            response = PayPalStatusView.as_view()(request, order_id=payment.order_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['payment_status'], 'paid')
        self.assertEqual(LedgerEntries.objects.count(), 1)

    def test_refund_event_is_flagged_for_review_without_reconfirming(self):
        _, payment = self.checkout()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            paypal_service.capture_checkout(self.customer, 'PPORDER01')
        event = {'id': 'REFUND01', 'event_type': 'PAYMENT.CAPTURE.REFUNDED', 'resource': {'supplementary_data': {'related_ids': {'capture_id': 'CAPTURE01'}}}}
        with patch.object(PayPalClient, 'verify_webhook', return_value=True):
            self.assertEqual(self.request(PayPalWebhookView, data=event).status_code, 200)
        payment.refresh_from_db()
        self.assertTrue(payment.raw_response['needs_review'])
        self.assertEqual(LedgerEntries.objects.count(), 1)

    def test_expired_or_wrong_gateway_order_cannot_start_checkout(self):
        result = self.book()
        order = Orders.objects.get(pk=result['order_id'])
        order.expires_at = timezone.now() - timedelta(seconds=1)
        order.save(update_fields=['expires_at'])
        self.assertEqual(self.request(PayPalCreateOrderView, data={'order_id': order.id}, user=self.customer).status_code, 400)
        order.expires_at = None
        order.shipping_address = {'payment_method': 'payos'}
        order.save(update_fields=['expires_at', 'shipping_address'])
        self.assertEqual(self.request(PayPalCreateOrderView, data={'order_id': order.id}, user=self.customer).status_code, 400)

    def test_cancel_releases_seats_only_once(self):
        _, payment = self.checkout()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, status='CREATED')):
            self.assertTrue(paypal_service.cancel_checkout(self.customer, payment.order_id)['cancelled'])
            self.assertTrue(paypal_service.cancel_checkout(self.customer, payment.order_id)['cancelled'])
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)

    def test_paypal_refund_request_and_admin_approval_restores_slot_points_and_excludes_from_fund(self):
        from apps.gamification.models.gamification_models import PointsLedger
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import (
            RefundAdminListView,
            RefundProcessAdminView,
            _get_conservation_fund_totals,
        )
        from apps.payments.services.admin_payout_service import payout_overview

        self.customer.total_eco_points = 500
        self.customer.save(update_fields=['total_eco_points'])
        booking_res = TourService.book_tour_slot(
            {**self.booking, 'use_points_discount': True},
            customer=self.customer,
        )
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        usd = payment.raw_response['amount_usd']
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, amount=usd)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Thay đổi lịch trình'}, format='json')
        force_authenticate(req, user=self.customer)
        resp = CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id)
        self.assertEqual(resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'requested')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'on_hold')
        self.assertEqual(payout_overview()['pending_payouts'], [])

        admin = Users.objects.create(name='BQL Admin', role='system_admin')
        list_resp = self.request(RefundAdminListView, method='get', user=admin)
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(list_resp.data['pending_count'], 1)

        with patch.object(
            PayPalClient,
            'refund_capture',
            return_value={'id': 'PPREFUND01', 'status': 'COMPLETED'},
        ) as refund_call:
            proc_req = APIRequestFactory().post('/', {'decision': 'approve', 'admin_note': 'OK'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        refund_call.assert_called_once()
        self.assertEqual(refund_call.call_args.kwargs['capture_id'], 'CAPTURE01')
        ov.refresh_from_db()
        self.assertEqual(ov.status, 'cancelled')
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.refunded_amount, ov.subtotal)
        self.assertEqual(Orders.objects.get(pk=ov.order_id).payment_status, 'refunded')
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)
        self.assertEqual(
            PointsLedger.objects.filter(
                user=self.customer, reference_type='booking_points_refund', points_change=200
            ).count(),
            1,
        )
        total_fund, _, _ = _get_conservation_fund_totals()
        self.assertEqual(total_fund, Decimal('250000000.00'))

    def test_payos_refund_request_requires_bank_info_and_uses_mock_payout(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        res = TourService.book_tour_slot(
            {**self.booking, 'payment_method': 'payos'},
            customer=self.customer,
        )
        pt = PaymentTransactions.objects.create(
            order_id=res['order_id'],
            payment_gateway='payos',
            transaction_code='998877',
            amount=450000,
            status='pending',
        )
        confirm_order_payment(pt.transaction_code, {'status': 'PAID', 'code': '00', 'amount': 450000})
        ov = OrderVendors.objects.get(order_id=res['order_id'])

        # Missing bank info -> 400
        bad_req = APIRequestFactory().post('/', {'reason': 'Bận đột xuất'}, format='json')
        force_authenticate(bad_req, user=self.customer)
        bad_resp = CustomerTourBookingRefundRequestView.as_view()(bad_req, booking_id=ov.id)
        self.assertEqual(bad_resp.status_code, 400)

        good_req = APIRequestFactory().post(
            '/',
            {
                'reason': 'Bận đột xuất',
                'bank_bin': '970422',
                'bank_name': 'MB Bank',
                'account_number': '0979520852',
                'account_holder': 'NGUYEN TUAN PHONG',
            },
            format='json',
        )
        force_authenticate(good_req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(good_req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 2', role='system_admin')
        with patch.dict('os.environ', {'PAYOS_PAYOUT_MODE': 'mock'}):
            proc_req = APIRequestFactory().post('/', {'decision': 'approve'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        self.assertEqual(proc_resp.data['provider_mode'], 'payos_mock')
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.status, 'cancelled')

    def test_admin_reject_refund_restores_ledger_to_recorded(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        booking_res = self.book()
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Muốn hoàn'}, format='json')
        force_authenticate(req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 3', role='system_admin')
        proc_req = APIRequestFactory().post('/', {'decision': 'reject', 'admin_note': 'Quá hạn hủy'}, format='json')
        force_authenticate(proc_req, user=admin)
        proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)
        self.assertEqual(proc_resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'rejected')
        self.assertEqual(ov.status, 'confirmed')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'recorded')

    def test_cannot_cancel_a_captured_payment(self):
        _, payment = self.checkout()
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            with self.assertRaises(Exception):
                paypal_service.cancel_checkout(self.customer, payment.order_id)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 1)

    def test_verified_webhook_and_replay_fulfill_once(self):
        _, payment = self.checkout()
        event = {'id': 'EV01', 'event_type': 'PAYMENT.CAPTURE.COMPLETED', 'resource': {'supplementary_data': {'related_ids': {'order_id': 'PPORDER01'}}}}
        with patch.object(PayPalClient, 'verify_webhook', return_value=True), patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            for _ in range(2):
                self.assertEqual(self.request(PayPalWebhookView, data=event).status_code, 200)
        self.assertEqual(LedgerEntries.objects.count(), 1)
        payment.refresh_from_db()
        self.assertEqual(payment.raw_response['webhook_event_ids'], ['EV01'])

    def test_unverified_webhook_does_not_query_or_change_payment(self):
        event = {'id': 'EV01', 'event_type': 'PAYMENT.CAPTURE.COMPLETED', 'resource': {}}
        with patch.object(PayPalClient, 'verify_webhook', return_value=False), patch.object(PayPalClient, 'details') as details:
            self.assertEqual(self.request(PayPalWebhookView, data=event).status_code, 403)
            details.assert_not_called()

    def test_sandbox_only_and_invalid_rate(self):
        with patch.dict('os.environ', {'PAYPAL_MODE': 'live'}):
            with self.assertRaises(PayPalError):
                PayPalClient()
        for rate in ['NaN', '0', '-1', 'invalid']:
            with patch.dict('os.environ', {'PAYPAL_DEMO_VND_PER_USD': rate}):
                with self.assertRaises(PayPalError):
                    PayPalClient.rate()

    def test_payos_settlement_still_works_and_is_idempotent(self):
        with patch('apps.payments.services.payos_service.PayOSService.create_payment_link', return_value={
            'status': 'success', 'data': {'qrCode': 'test-qr'},
        }) as create_link:
            result = TourService.book_tour_slot({**self.booking, 'payment_method': 'payos'}, customer=self.customer)
        create_link.assert_called_once()
        self.assertEqual(LedgerEntries.objects.count(), 0)
        pt = PaymentTransactions.objects.get(order_id=result['order_id'], payment_gateway='payos')
        confirm_order_payment(pt.transaction_code, {'status': 'PAID', 'code': '00', 'amount': 450000})
        confirm_order_payment(pt.transaction_code, {'status': 'PAID', 'code': '00', 'amount': 450000})
        self.assertEqual(LedgerEntries.objects.count(), 1)
        pt.refresh_from_db()
        self.assertEqual(pt.status, 'paid')

    def test_cancel_restores_voucher_and_points_and_works_without_payment_tx(self):
        from apps.orders.models import Vouchers, UserVouchers
        from apps.gamification.models.gamification_models import PointsLedger

        self.customer.total_eco_points = 500
        self.customer.save(update_fields=['total_eco_points'])
        voucher = Vouchers.objects.create(
            code='ECO15',
            title='Giảm 15%',
            discount_percent=15,
            points_required=0,
            effective_from=timezone.now() - timedelta(days=1),
            effective_to=timezone.now() + timedelta(days=10),
        )
        uv = UserVouchers.objects.create(user=self.customer, voucher=voucher, status='unused')
        booking_res = TourService.book_tour_slot(
            {**self.booking, 'voucher_code': 'ECO15', 'use_points_discount': True},
            customer=self.customer,
        )
        uv.refresh_from_db()
        self.assertEqual(uv.status, 'used')
        self.assertEqual(
            PointsLedger.objects.filter(
                user=self.customer, reference_type='booking_points_discount', points_change=-200
            ).count(),
            1,
        )

        # Cancel directly before PaymentTransactions row is created
        cancelled_summary = paypal_service.cancel_checkout(self.customer, booking_res['order_id'])
        self.assertTrue(cancelled_summary['cancelled'])
        self.assertEqual(cancelled_summary['order_payment_status'], 'cancelled')
        # Re-cancelling is idempotent and never double-refunds
        paypal_service.cancel_checkout(self.customer, booking_res['order_id'])

        uv.refresh_from_db()
        self.assertEqual(uv.status, 'unused')
        self.assertIsNone(uv.used_at)
        self.assertEqual(
            PointsLedger.objects.filter(
                user=self.customer, reference_type='booking_points_refund', points_change=200
            ).count(),
            1,
        )
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)

    def test_paypal_refund_request_and_admin_approval_restores_slot_points_and_excludes_from_fund(self):
        from apps.gamification.models.gamification_models import PointsLedger
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import (
            RefundAdminListView,
            RefundProcessAdminView,
            _get_conservation_fund_totals,
        )
        from apps.payments.services.admin_payout_service import payout_overview

        self.customer.total_eco_points = 500
        self.customer.save(update_fields=['total_eco_points'])
        booking_res = TourService.book_tour_slot(
            {**self.booking, 'use_points_discount': True},
            customer=self.customer,
        )
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        usd = payment.raw_response['amount_usd']
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment, amount=usd)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Thay đổi lịch trình'}, format='json')
        force_authenticate(req, user=self.customer)
        resp = CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id)
        self.assertEqual(resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'requested')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'on_hold')
        self.assertEqual(payout_overview()['pending_payouts'], [])

        admin = Users.objects.create(name='BQL Admin', role='system_admin')
        list_resp = self.request(RefundAdminListView, method='get', user=admin)
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(list_resp.data['pending_count'], 1)

        with patch.object(
            PayPalClient,
            'refund_capture',
            return_value={'id': 'PPREFUND01', 'status': 'COMPLETED'},
        ) as refund_call:
            proc_req = APIRequestFactory().post('/', {'decision': 'approve', 'admin_note': 'OK'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        refund_call.assert_called_once()
        self.assertEqual(refund_call.call_args.kwargs['capture_id'], 'CAPTURE01')
        ov.refresh_from_db()
        self.assertEqual(ov.status, 'cancelled')
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.refunded_amount, ov.subtotal)
        self.assertEqual(Orders.objects.get(pk=ov.order_id).payment_status, 'refunded')
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)
        self.assertEqual(
            PointsLedger.objects.filter(
                user=self.customer, reference_type='booking_points_refund', points_change=200
            ).count(),
            1,
        )
        total_fund, _, _ = _get_conservation_fund_totals()
        self.assertEqual(total_fund, Decimal('250000000.00'))

    def test_payos_refund_request_requires_bank_info_and_uses_mock_payout(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        res = TourService.book_tour_slot(
            {**self.booking, 'payment_method': 'payos'},
            customer=self.customer,
        )
        pt = PaymentTransactions.objects.create(
            order_id=res['order_id'],
            payment_gateway='payos',
            transaction_code='998877',
            amount=450000,
            status='pending',
        )
        confirm_order_payment(pt.transaction_code, {'status': 'PAID', 'code': '00', 'amount': 450000})
        ov = OrderVendors.objects.get(order_id=res['order_id'])

        # Missing bank info -> 400
        bad_req = APIRequestFactory().post('/', {'reason': 'Bận đột xuất'}, format='json')
        force_authenticate(bad_req, user=self.customer)
        bad_resp = CustomerTourBookingRefundRequestView.as_view()(bad_req, booking_id=ov.id)
        self.assertEqual(bad_resp.status_code, 400)

        good_req = APIRequestFactory().post(
            '/',
            {
                'reason': 'Bận đột xuất',
                'bank_bin': '970422',
                'bank_name': 'MB Bank',
                'account_number': '0979520852',
                'account_holder': 'NGUYEN TUAN PHONG',
            },
            format='json',
        )
        force_authenticate(good_req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(good_req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 2', role='system_admin')
        with patch.dict('os.environ', {'PAYOS_PAYOUT_MODE': 'mock'}):
            proc_req = APIRequestFactory().post('/', {'decision': 'approve'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        self.assertEqual(proc_resp.data['provider_mode'], 'payos_mock')
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(ov.status, 'cancelled')

    def test_admin_reject_refund_restores_ledger_to_recorded(self):
        from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView
        from apps.payments.views.admin_payment_views import RefundProcessAdminView

        booking_res = self.book()
        created = {
            'id': 'PPORDER01',
            'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER01'}],
            'purchase_units': [{'payee': {'merchant_id': 'SELLER01'}}],
        }
        with patch.object(PayPalClient, 'create', return_value=created):
            paypal_service.create_checkout(self.customer, booking_res['order_id'])
        payment = PaymentTransactions.objects.get(payment_gateway='paypal')
        with patch.object(PayPalClient, 'details', return_value=self.provider(payment)):
            self.request(PayPalCaptureView, data={'paypal_order_id': 'PPORDER01'}, user=self.customer)

        ov = OrderVendors.objects.get(order_id=booking_res['order_id'])
        req = APIRequestFactory().post('/', {'reason': 'Muốn hoàn'}, format='json')
        force_authenticate(req, user=self.customer)
        self.assertEqual(CustomerTourBookingRefundRequestView.as_view()(req, booking_id=ov.id).status_code, 200)

        admin = Users.objects.create(name='BQL Admin 3', role='system_admin')
        proc_req = APIRequestFactory().post('/', {'decision': 'reject', 'admin_note': 'Quá hạn hủy'}, format='json')
        force_authenticate(proc_req, user=admin)
        proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)
        self.assertEqual(proc_resp.status_code, 200)
        ov.refresh_from_db()
        self.assertEqual(ov.refund_status, 'rejected')
        self.assertEqual(ov.status, 'confirmed')
        self.assertEqual(LedgerEntries.objects.get(order_vendor=ov).payout_status, 'recorded')
