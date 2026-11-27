from datetime import time

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import Users
from apps.orders.models import OrderItems, Orders, OrderVendors
from apps.vendors.models import Vendors

from .models import Tours, TourSchedules
from .views.schedule_chat_views import ScheduleChatView


class ScheduleChatTests(TestCase):
    def test_paid_bookers_share_their_exact_departure_and_refund_revokes_access(self):
        owner = Users.objects.create(name='Vendor', role='vendor_admin')
        vendor = Vendors.objects.create(user=owner, brand_name='Vendor')
        tour = Tours.objects.create(vendor=vendor, title='Sơn Trà', slug='son-tra-chat',
                                    price=50000, duration_hours=3)
        today = timezone.localdate()
        first = TourSchedules.objects.create(tour=tour, departure_date=today)
        second = TourSchedules.objects.create(tour=tour, departure_date=today, start_time=time(12))

        def book(name, schedule, payment_status='paid'):
            buyer = Users.objects.create(name=name, role='customer')
            order = Orders.objects.create(customer=buyer, order_code=name, grand_total=50000,
                                          payment_status=payment_status)
            booking = OrderVendors.objects.create(order=order, vendor=vendor, subtotal=50000,
                                                 status='confirmed')
            OrderItems.objects.create(order_vendor=booking, item_type='tour', tour=tour,
                                      tour_schedule=schedule, unit_price=50000, price_at_sale_time=50000)
            return buyer, booking

        alice, _ = book('Alice', first)
        bob, booking = book('Bob', first, 'pending')
        charlie, _ = book('Charlie', second)
        factory = APIRequestFactory()

        def request(user, schedule, content=None):
            req = factory.get('/') if content is None else factory.post('/', {'content': content}, format='json')
            force_authenticate(req, user=user)
            return ScheduleChatView.as_view()(req, schedule_id=schedule.id)

        self.assertEqual(request(bob, first).status_code, 403)
        self.assertEqual(request(bob, first, 'Chưa thanh toán').status_code, 403)
        self.assertEqual(request(alice, first, '  ').status_code, 400)
        self.assertEqual(request(alice, first, 'Hẹn gặp ở điểm tập trung!').status_code, 201)
        self.assertEqual(request(charlie, first).status_code, 403)
        self.assertEqual(request(charlie, second).data['data']['messages'], [])

        booking.order.payment_status = 'paid'
        booking.order.save(update_fields=['payment_status'])
        message, = request(bob, first).data['data']['messages']
        self.assertEqual(message['sender_name'], 'Alice')
        self.assertEqual(message['content'], 'Hẹn gặp ở điểm tập trung!')
        self.assertFalse(message['is_mine'])
        self.assertEqual(request(bob, first, 'Đã rõ!').status_code, 201)

        booking.refund_status = 'refunded'
        booking.save(update_fields=['refund_status'])
        self.assertEqual(request(bob, first).status_code, 403)
        self.assertEqual(request(bob, first, 'Tin mới').status_code, 403)
