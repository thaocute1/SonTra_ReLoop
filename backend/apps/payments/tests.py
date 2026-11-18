from contextlib import ExitStack, nullcontext
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from .views.admin_payment_views import (
    BASE_CONSERVATION_GRANT,
    ConservationFundAdminView,
    ConservationFundAllocateView,
)
from .views.payos_views import (
    PayOSCancelPaymentLinkView,
    PayOSCreatePaymentLinkView,
    PayOSWebhookView,
    confirm_order_payment,
)


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
        tx_record = SimpleNamespace(id=20, order_id=10, order=order, status='pending', save=Mock())
        order_item = SimpleNamespace(tour_schedule_id=99, quantity=3, campaign_item_id=None)
        order_vendor = SimpleNamespace(status='waiting_payment', orderitems_set=SimpleNamespace(all=lambda: [order_item]))

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
            orders_cls = stack.enter_context(patch(module + 'Orders'))
            pt_cls = stack.enter_context(patch(module + 'PaymentTransactions'))
            ov_cls = stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(module + 'PayOSService.get_payment_link_information', return_value={'status': 'success', 'data': {'status': 'PENDING'}}))
            stack.enter_context(patch(module + 'PayOSService.cancel_payment_link', return_value={'code': '00'}))
            ts_cls = stack.enter_context(patch('apps.tours.models.TourSchedules'))

            pt_cls.objects.filter.return_value.select_related.return_value.first.return_value = tx_record
            orders_cls.objects.select_for_update.return_value.get.return_value = order
            pt_cls.objects.select_for_update.return_value.get.return_value = tx_record
            ts_cls.objects.select_for_update.return_value.filter.return_value.first.return_value = schedule

            ov_list_mock = Mock()
            ov_list_mock.__iter__ = Mock(return_value=iter([order_vendor]))
            ov_cls.objects.select_for_update.return_value.filter.return_value = ov_list_mock

            response = PayOSCancelPaymentLinkView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(schedule.booked_count, 7)
        self.assertEqual(schedule.status, 'almost_full')
        schedule.save.assert_called_once_with(update_fields=['booked_count', 'status', 'updated_at'])

    def test_create_payment_link_blocks_cancelled_failed_or_expired_orders(self):
        user = SimpleNamespace(id=7, is_authenticated=True)
        now = timezone.now()
        cases = [
            SimpleNamespace(id=1, order_code='ORD-F', payment_status='failed', expires_at=None, ordervendors_set=MagicMock()),
            SimpleNamespace(id=2, order_code='ORD-C', payment_status='cancelled', expires_at=None, ordervendors_set=MagicMock()),
            SimpleNamespace(id=3, order_code='ORD-E', payment_status='pending', expires_at=now - timedelta(minutes=1), ordervendors_set=MagicMock()),
            SimpleNamespace(id=4, order_code='ORD-V', payment_status='pending', expires_at=None, ordervendors_set=MagicMock()),
        ]
        for idx, order in enumerate(cases):
            order.ordervendors_set.filter.return_value.exists.return_value = (idx == 3)
            request = self.factory.post('/api/v1/payments/payos/create-link/', {'order_id': order.id}, format='json')
            force_authenticate(request, user=user)
            with patch('apps.payments.views.payos_views.Orders.objects.filter') as orders_filter, \
                 patch('apps.payments.views.payos_views.PayOSService.create_payment_link') as create_link:
                orders_filter.return_value.first.return_value = order
                resp = PayOSCreatePaymentLinkView.as_view()(request)
            self.assertEqual(resp.status_code, 400)
            create_link.assert_not_called()

    def test_confirm_order_payment_blocks_cancelled_or_failed_order(self):
        order = SimpleNamespace(id=10, pk=10, order_code='ORD-F', payment_status='failed', save=Mock())
        pt = SimpleNamespace(id=20, pk=20, order_id=10, order=order, amount=Decimal('500000'), status='failed', save=Mock())
        ov = SimpleNamespace(id=30, status='cancelled')
        module = 'apps.payments.views.payos_views.'
        with ExitStack() as stack:
            orders_cls = stack.enter_context(patch(module + 'Orders'))
            pt_cls = stack.enter_context(patch(module + 'PaymentTransactions'))
            ov_cls = stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))

            pt_cls.objects.filter.return_value.select_related.return_value.first.return_value = pt
            orders_cls.objects.select_for_update.return_value.get.return_value = order
            pt_cls.objects.select_for_update.return_value.get.return_value = pt
            ov_qs = MagicMock()
            ov_qs.__iter__.return_value = iter([ov])
            ov_cls.objects.select_for_update.return_value.filter.return_value = ov_qs

            result = confirm_order_payment('123456', {'code': '00', 'amount': 500000})

        self.assertIsNone(result)
        order.save.assert_not_called()
        ov_qs.update.assert_not_called()
        pt.save.assert_not_called()

    def test_cancel_link_does_not_overwrite_transaction_when_order_already_paid(self):
        user = SimpleNamespace(id=7, is_authenticated=True)
        pending_snapshot = SimpleNamespace(id=10, order_code='ORD-1', payment_status='pending', shipping_address={})
        paid_locked_order = SimpleNamespace(id=10, order_code='ORD-1', payment_status='paid', shipping_address={})
        tx_record = SimpleNamespace(id=20, order_id=10, order=pending_snapshot, status='pending', save=Mock())

        request = self.factory.post('/api/v1/payments/payos/cancel-link/', {'order_code': '123456'}, format='json')
        force_authenticate(request, user=user)

        module = 'apps.payments.views.payos_views.'
        with ExitStack() as stack:
            orders_cls = stack.enter_context(patch(module + 'Orders'))
            pt_cls = stack.enter_context(patch(module + 'PaymentTransactions'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(module + 'PayOSService.get_payment_link_information', return_value={'status': 'success', 'data': {'status': 'PENDING'}}))
            stack.enter_context(patch(module + 'PayOSService.cancel_payment_link', return_value={'code': '00'}))

            pt_cls.objects.filter.return_value.select_related.return_value.first.return_value = tx_record
            orders_cls.objects.select_for_update.return_value.get.return_value = paid_locked_order
            pt_cls.objects.select_for_update.return_value.get.return_value = tx_record

            response = PayOSCancelPaymentLinkView.as_view()(request)

        self.assertEqual(response.status_code, 409)
        tx_record.save.assert_not_called()


class ConservationFundSecurityTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = SimpleNamespace(id=1, role='system_admin', is_authenticated=True)

    def test_fund_admin_only_sums_paid_non_cancelled_ledger_entries(self):
        req = self.factory.get('/api/v1/payments/conservation-funds/')
        force_authenticate(req, user=self.admin)

        ledger_qs = MagicMock()
        ledger_qs.filter.return_value = ledger_qs
        ledger_qs.exclude.return_value = ledger_qs
        ledger_qs.aggregate.return_value = {'total': Decimal('1000000.00')}

        alloc_qs = MagicMock()
        alloc_qs.order_by.return_value = []
        alloc_qs.aggregate.return_value = {'total': Decimal('0.00')}

        with patch('apps.payments.views.admin_payment_views.LedgerEntries.objects', ledger_qs), \
             patch('apps.payments.views.admin_payment_views.ConservationAllocations.objects', alloc_qs):
            resp = ConservationFundAdminView.as_view()(req)

        self.assertEqual(resp.status_code, 200)
        ledger_qs.filter.assert_called_once_with(order_vendor__order__payment_status='paid')
        self.assertEqual(ledger_qs.exclude.call_count, 2)
        self.assertEqual(resp.data['total_fund_accumulated'], int(BASE_CONSERVATION_GRANT) + 1000000)

    def test_allocate_rejects_negative_zero_invalid_or_over_budget_amounts(self):
        for bad_amount in (-500000, 0, 'not-a-number', 500000000):
            req = self.factory.post(
                '/api/v1/payments/conservation-funds/allocate/',
                {'project_name': 'Trồng rừng', 'amount': bad_amount},
                format='json',
            )
            force_authenticate(req, user=self.admin)
            with patch('apps.payments.views.admin_payment_views.transaction.atomic', side_effect=nullcontext), \
                 patch('apps.payments.views.admin_payment_views._get_conservation_fund_totals', return_value=(BASE_CONSERVATION_GRANT, Decimal('0'), Decimal('250000000'))), \
                 patch('apps.payments.views.admin_payment_views.ConservationAllocations.objects.create') as create_alloc:
                resp = ConservationFundAllocateView.as_view()(req)
            self.assertEqual(resp.status_code, 400)
            create_alloc.assert_not_called()

    def test_allocate_accepts_positive_amount_within_remaining_fund(self):
        req = self.factory.post(
            '/api/v1/payments/conservation-funds/allocate/',
            {'project_name': 'Bảo vệ Voọc chà vá', 'amount': 50000000},
            format='json',
        )
        force_authenticate(req, user=self.admin)
        fake_alloc = SimpleNamespace(id=9, project_name='Bảo vệ Voọc chà vá', allocated_amount=Decimal('50000000'))
        with patch('apps.payments.views.admin_payment_views.transaction.atomic', side_effect=nullcontext), \
             patch('apps.payments.views.admin_payment_views._get_conservation_fund_totals', return_value=(BASE_CONSERVATION_GRANT, Decimal('0'), Decimal('250000000'))), \
             patch('apps.payments.views.admin_payment_views.ConservationAllocations.objects.create', return_value=fake_alloc) as create_alloc:
            resp = ConservationFundAllocateView.as_view()(req)
        self.assertEqual(resp.status_code, 201)
        create_alloc.assert_called_once()
