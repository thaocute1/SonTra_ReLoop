from datetime import timedelta
from decimal import Decimal
from unittest.mock import Mock, patch
import urllib.parse

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models.user_models import Users
from apps.orders.models import OrderVendors, Orders
from apps.payments.models import LedgerEntries, PaymentTransactions
from apps.payments.services import vnpay_service
from apps.payments.views.admin_payment_views import RefundProcessAdminView
from apps.payments.views.vnpay_views import (
    VNPayCancelView,
    VNPayConfigView,
    VNPayCreatePaymentView,
    VNPayIPNView,
    VNPayReturnVerifyView,
)
from apps.tours.models import TourSchedules, Tours
from apps.tours.services.tour_service import TourService
from apps.tours.views.tour_views import CustomerTourBookingRefundRequestView, TourBookingCreateView
from apps.vendors.models import Vendors


class VNPayTests(TestCase):
    def setUp(self):
        self.env = patch.dict(
            'os.environ',
            {
                'VNPAY_TMN_CODE': 'CTC8UOO8',
                'VNPAY_HASH_SECRET': 'TESTSECRETKEY1234567890ABCDEF',
                'VNPAY_PAYMENT_URL': 'https://sandbox.vnpaytest.vn/paymentv2/vpcpay.html',
                'VNPAY_API_URL': 'https://sandbox.vnpaytest.vn/merchant_webapi/api/transaction',
                'VNPAY_FRONTEND_URL': 'http://localhost:5173',
                'VNPAY_REFUND_MODE': 'sandbox',
            },
        )
        self.env.start()
        self.addCleanup(self.env.stop)

        self.customer = Users.objects.create(name='VNPay Buyer', role='customer')
        owner = Users.objects.create(name='VNPay Vendor', role='vendor_admin')
        self.vendor = Vendors.objects.create(user=owner, brand_name='VNPay Vendor', status='approved')
        self.tour = Tours.objects.create(
            vendor=self.vendor,
            title='Tour Son Tra VNPay',
            slug='tour-son-tra-vnpay',
            price=450000,
            duration_hours=3,
            status='published',
        )
        self.schedule = TourSchedules.objects.create(
            tour=self.tour,
            departure_date=timezone.localdate() + timedelta(days=2),
            max_capacity=5,
            price=450000,
        )
        self.booking = {
            'tour_id': self.tour.id,
            'schedule_id': self.schedule.id,
            'adults_count': 1,
            'customer_name': 'VNPay Buyer',
            'customer_phone': '0901234567',
            'payment_method': 'vnpay',
        }

    def _signed_callback_params(self, payment, resp_code='00'):
        params = {
            'vnp_TmnCode': 'CTC8UOO8',
            'vnp_Amount': str(int(Decimal(payment.amount) * 100)),
            'vnp_BankCode': 'NCB',
            'vnp_BankTranNo': 'VNP14500001',
            'vnp_CardType': 'ATM',
            'vnp_OrderInfo': f'Thanh toan don tour {payment.order.order_code}',
            'vnp_PayDate': '20261127135000',
            'vnp_ResponseCode': resp_code,
            'vnp_TransactionNo': '14500001',
            'vnp_TransactionStatus': resp_code,
            'vnp_TxnRef': payment.transaction_code,
        }
        hash_data = vnpay_service.build_query_hash_data(params)
        params['vnp_SecureHash'] = vnpay_service._hmac_sha512(
            'TESTSECRETKEY1234567890ABCDEF', hash_data
        )
        return params

    def test_vnpay_config_and_create_payment_url_without_unpaid_ledger(self):
        cfg_req = APIRequestFactory().get('/api/v1/payments/vnpay/config/')
        force_authenticate(cfg_req, user=self.customer)
        cfg_resp = VNPayConfigView.as_view()(cfg_req)
        self.assertEqual(cfg_resp.status_code, 200)
        self.assertTrue(cfg_resp.data['available'])

        book_req = APIRequestFactory().post('/api/v1/orders/booking/', self.booking, format='json')
        force_authenticate(book_req, user=self.customer)
        book_resp = TourBookingCreateView.as_view()(book_req)
        self.assertEqual(book_resp.status_code, 201)
        booked = book_resp.data['data']
        self.assertEqual(LedgerEntries.objects.count(), 0)

        req = APIRequestFactory().post(
            '/api/v1/payments/vnpay/create-payment/',
            {'order_id': booked['order_id']},
            format='json',
        )
        force_authenticate(req, user=self.customer)
        resp = VNPayCreatePaymentView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        payment_url = resp.data['data']['payment_url']
        parsed = urllib.parse.urlparse(payment_url)
        qs = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(parsed.hostname, 'sandbox.vnpaytest.vn')
        self.assertEqual(qs['vnp_TmnCode'][0], 'CTC8UOO8')
        self.assertEqual(qs['vnp_Amount'][0], '45000000')
        self.assertEqual(qs['vnp_Command'][0], 'pay')
        self.assertEqual(qs['vnp_BankCode'][0], 'NCB')
        self.assertIn('vnp_SecureHash', qs)
        self.assertEqual(PaymentTransactions.objects.filter(payment_gateway='vnpay', status='pending').count(), 1)

    def test_vnpay_rejects_amount_below_10000_vnd(self):
        small_tour = Tours.objects.create(
            vendor=self.vendor,
            title='Tour Nho',
            slug='tour-nho',
            price=5000,
            duration_hours=1,
            status='published',
        )
        small_sch = TourSchedules.objects.create(
            tour=small_tour,
            departure_date=timezone.localdate() + timedelta(days=3),
            max_capacity=5,
            price=5000,
        )
        booked = TourService.book_tour_slot(
            {**self.booking, 'tour_id': small_tour.id, 'schedule_id': small_sch.id},
            customer=self.customer,
        )
        req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(req, user=self.customer)
        resp = VNPayCreatePaymentView.as_view()(req)
        self.assertEqual(resp.status_code, 400)

    def test_vnpay_return_and_ipn_confirm_once_and_store_transaction_history(self):
        booked = TourService.book_tour_slot(self.booking, customer=self.customer)
        create_req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(create_req, user=self.customer)
        VNPayCreatePaymentView.as_view()(create_req)
        payment = PaymentTransactions.objects.get(payment_gateway='vnpay')

        params = self._signed_callback_params(payment, resp_code='00')
        ret_req = APIRequestFactory().post('/api/v1/payments/vnpay/return/', params, format='json')
        force_authenticate(ret_req, user=self.customer)
        ret_resp = VNPayReturnVerifyView.as_view()(ret_req)
        self.assertEqual(ret_resp.status_code, 200)
        self.assertEqual(ret_resp.data['data']['payment_status'], 'paid')
        self.assertEqual(ret_resp.data['data']['vnp_transaction_no'], '14500001')

        # Replay via IPN returns 02 Order already confirmed without duplicate ledger
        ipn_req = APIRequestFactory().get('/api/v1/payments/vnpay/ipn/', params)
        ipn_resp = VNPayIPNView.as_view()(ipn_req)
        self.assertEqual(ipn_resp.status_code, 200)
        self.assertEqual(ipn_resp.data['RspCode'], '02')
        self.assertEqual(LedgerEntries.objects.count(), 1)

        # Invalid checksum rejected with RspCode 97
        tampered = {**params, 'vnp_Amount': '100'}
        bad_ipn = VNPayIPNView.as_view()(APIRequestFactory().get('/api/v1/payments/vnpay/ipn/', tampered))
        self.assertEqual(bad_ipn.data['RspCode'], '97')

        # Transaction history surfaced in customer bookings
        bookings = TourService.get_customer_bookings(user=self.customer)
        self.assertEqual(len(bookings), 1)
        tx_info = bookings[0]['payment_transaction']
        self.assertEqual(tx_info['gateway'], 'vnpay')
        self.assertEqual(tx_info['vnp_transaction_no'], '14500001')
        self.assertEqual(tx_info['vnp_bank_code'], 'NCB')

    def test_vnpay_cancel_releases_seat(self):
        booked = TourService.book_tour_slot(self.booking, customer=self.customer)
        create_req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(create_req, user=self.customer)
        VNPayCreatePaymentView.as_view()(create_req)

        cancel_req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(cancel_req, user=self.customer)
        cancel_resp = VNPayCancelView.as_view()(cancel_req)
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertTrue(cancel_resp.data['data']['cancelled'])
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)

    def test_vnpay_refund_request_and_admin_approval_calls_vnpay_api(self):
        booked = TourService.book_tour_slot(self.booking, customer=self.customer)
        create_req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(create_req, user=self.customer)
        VNPayCreatePaymentView.as_view()(create_req)
        payment = PaymentTransactions.objects.get(payment_gateway='vnpay')

        params = self._signed_callback_params(payment, resp_code='00')
        ret_req = APIRequestFactory().post('/', params, format='json')
        force_authenticate(ret_req, user=self.customer)
        VNPayReturnVerifyView.as_view()(ret_req)

        ov = OrderVendors.objects.get(order_id=booked['order_id'])
        # VNPAY refund request does not require manual bank info
        refund_req = APIRequestFactory().post('/', {'reason': 'Đổi lịch trình'}, format='json')
        force_authenticate(refund_req, user=self.customer)
        refund_resp = CustomerTourBookingRefundRequestView.as_view()(refund_req, booking_id=ov.id)
        self.assertEqual(refund_resp.status_code, 200)

        admin = Users.objects.create(name='BQL Admin', role='system_admin')
        mock_http = Mock(status_code=200)
        mock_http.json.return_value = {'vnp_ResponseCode': '00', 'vnp_TransactionNo': 'REFVNP999'}

        with patch('apps.payments.services.vnpay_service.requests.post', return_value=mock_http) as post_call:
            proc_req = APIRequestFactory().post('/', {'decision': 'approve'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 200)
        self.assertEqual(proc_resp.data['provider_mode'], 'vnpay_sandbox')
        self.assertEqual(proc_resp.data['refund_reference'], 'REFVNP999')
        sent_payload = post_call.call_args.kwargs['json']
        self.assertEqual(sent_payload['vnp_Command'], 'refund')
        self.assertEqual(sent_payload['vnp_TransactionType'], '02')
        self.assertEqual(sent_payload['vnp_Amount'], 45000000)

        ov.refresh_from_db()
        self.assertEqual(ov.status, 'cancelled')
        self.assertEqual(ov.refund_status, 'refunded')
        self.assertEqual(Orders.objects.get(pk=ov.order_id).payment_status, 'refunded')
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.booked_count, 0)
        payment.refresh_from_db()
        self.assertEqual(payment.raw_response.get('refund_reference'), 'REFVNP999')

    def test_vnpay_refund_non_json_response_surfaces_http_status(self):
        booked = TourService.book_tour_slot(self.booking, customer=self.customer)
        create_req = APIRequestFactory().post('/', {'order_id': booked['order_id']}, format='json')
        force_authenticate(create_req, user=self.customer)
        VNPayCreatePaymentView.as_view()(create_req)
        payment = PaymentTransactions.objects.get(payment_gateway='vnpay')

        params = self._signed_callback_params(payment, resp_code='00')
        ret_req = APIRequestFactory().post('/', params, format='json')
        force_authenticate(ret_req, user=self.customer)
        VNPayReturnVerifyView.as_view()(ret_req)

        ov = OrderVendors.objects.get(order_id=booked['order_id'])
        refund_req = APIRequestFactory().post('/', {'reason': 'Khach huy'}, format='json')
        force_authenticate(refund_req, user=self.customer)
        CustomerTourBookingRefundRequestView.as_view()(refund_req, booking_id=ov.id)

        admin = Users.objects.create(name='BQL Admin 2', role='system_admin')
        mock_http = Mock(status_code=404)
        mock_http.json.side_effect = ValueError('No JSON')

        with patch('apps.payments.services.vnpay_service.requests.post', return_value=mock_http):
            proc_req = APIRequestFactory().post('/', {'decision': 'approve'}, format='json')
            force_authenticate(proc_req, user=admin)
            proc_resp = RefundProcessAdminView.as_view()(proc_req, order_vendor_id=ov.id)

        self.assertEqual(proc_resp.status_code, 502)
        self.assertIn('HTTP 404', str(proc_resp.data))
