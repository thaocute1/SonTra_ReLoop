from contextlib import ExitStack, nullcontext
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .views.payos_views import PayOSCancelPaymentLinkView, PayOSWebhookView


class PayOSSecurityTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('apps.payments.views.payos_views.confirm_order_payment')
    @patch('apps.payments.views.payos_views.PayOSService.verify_webhook_data', return_value=True)
    def test_webhook_rejects_non_success_code(self, _verify, confirm):
        request = self.factory.post(
            '/api/v1/payments/payos/webhook/',
            {'code': '01', 'success': False, 'data': {'orderCode': 123456, 'amount': 500000}},
            format='json',
        )
        response = PayOSWebhookView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        confirm.assert_not_called()

    @patch('apps.payments.views.payos_views.confirm_order_payment')
    @patch('apps.payments.views.payos_views.PaymentTransactions.objects.filter')
    @patch('apps.payments.views.payos_views.PayOSService.verify_webhook_data', return_value=True)
    def test_webhook_rejects_amount_mismatch(self, _verify, pt_filter, confirm):
        pt_filter.return_value.first.return_value = SimpleNamespace(amount=Decimal('500000.00'))
        request = self.factory.post(
            '/api/v1/payments/payos/webhook/',
            {'code': '00', 'success': True, 'data': {'orderCode': 123456, 'amount': 1000, 'code': '00'}},
            format='json',
        )
        response = PayOSWebhookView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        confirm.assert_not_called()

    def test_cancel_link_restores_schedule_slots_from_order_item(self):
        user = SimpleNamespace(id=7, is_authenticated=True)
        order = SimpleNamespace(id=10, order_code='ORD-1', payment_status='pending', shipping_address={}, save=Mock())
        tx_record = SimpleNamespace(id=20, order=order, status='pending', save=Mock())
        order_item = SimpleNamespace(tour_schedule_id=99, quantity=3, campaign_item_id=None)
        order_vendor = SimpleNamespace(orderitems_set=SimpleNamespace(all=lambda: [order_item]))

        class FakeSchedule:
            id = 99
            max_capacity = 10
            booked_count = 10
            status = 'full'
            save = Mock()

            @property
            def remaining_slots(self):
                return max(0, self.max_capacity - self.booked_count)

        schedule = FakeSchedule()
        request = self.factory.post('/api/v1/payments/payos/cancel-link/', {'order_code': '123456'}, format='json')
        force_authenticate(request, user=user)

        module = 'apps.payments.views.payos_views.'
        with ExitStack() as stack:
            pt_cls = stack.enter_context(patch(module + 'PaymentTransactions'))
            ov_cls = stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(module + 'PayOSService.get_payment_link_information', return_value={'status': 'success', 'data': {'status': 'PENDING'}}))
            stack.enter_context(patch(module + 'PayOSService.cancel_payment_link', return_value={'code': '00'}))
            ts_cls = stack.enter_context(patch('apps.tours.models.TourSchedules'))

            pt_cls.objects.filter.return_value.first.return_value = tx_record
            pt_cls.objects.select_for_update.return_value.select_related.return_value.get.return_value = tx_record
            ov_cls.objects.select_for_update.return_value.filter.return_value = [order_vendor]
            # Provide update() on the queryset mock
            ov_qs = ov_cls.objects.select_for_update.return_value.filter.return_value
            ts_cls.objects.select_for_update.return_value.filter.return_value.first.return_value = schedule

            # Use a list-like mock so iteration and .update() both work
            ov_list_mock = Mock()
            ov_list_mock.__iter__ = Mock(return_value=iter([order_vendor]))
            ov_cls.objects.select_for_update.return_value.filter.return_value = ov_list_mock

            response = PayOSCancelPaymentLinkView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(schedule.booked_count, 7)
        self.assertEqual(schedule.status, 'almost_full')
        schedule.save.assert_called_once_with(update_fields=['booked_count', 'status', 'updated_at'])
