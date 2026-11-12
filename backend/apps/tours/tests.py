from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from .services.tour_service import TourService
from .views.tour_views import TourBookingCreateView


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
        tour = SimpleNamespace(id=1, vendor=Mock(), title='Test tour', price=2000)
        schedule = SimpleNamespace(
            id=12, remaining_slots=10, price=2000, booked_count=0,
            max_capacity=10, status='open', departure_date=timezone.localdate(),
            start_time='06:00', end_time='10:30', save=Mock(),
        )
        module = 'apps.tours.services.tour_service.'
        with ExitStack() as stack:
            tours = stack.enter_context(patch(module + 'Tours'))
            schedules = stack.enter_context(patch(module + 'TourSchedules'))
            orders = stack.enter_context(patch(module + 'Orders'))
            stack.enter_context(patch(module + 'OrderVendors'))
            stack.enter_context(patch(module + 'OrderItems'))
            stack.enter_context(patch(module + 'LedgerEntries'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(
                'apps.payments.services.payos_service.PayOSService.create_payment_link',
                return_value={'status': 'error'},
            ))
            tours.objects.select_related.return_value.filter.return_value.first.return_value = tour
            schedules.objects.filter.return_value.first.return_value = schedule
            orders.objects.create.return_value = SimpleNamespace(id=3, order_code='TEST')
            result = TourService.book_tour_slot(self.data, customer=self.customer)
            self.assertIs(orders.objects.create.call_args.kwargs['customer'], self.customer)
            self.assertEqual(result['customer_email'], 'contact@example.com')
            self.assertEqual(result['payment_status'], 'pending')
            self.assertEqual(result['status'], 'waiting_payment')
            self.assertEqual(schedule.booked_count, 1)

    def test_service_rejects_missing_customer(self):
        with self.assertRaisesMessage(ValueError, 'đăng nhập lại'):
            TourService.book_tour_slot(self.data, customer=None)
