"""PayPal Orders v2 client. This integration deliberately accepts Sandbox only."""
import hashlib
import os
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
import requests
from django.core.cache import cache
from rest_framework.exceptions import APIException


class PayPalError(APIException):
    status_code = 502
    default_detail = 'Không kết nối được PayPal Sandbox. Vui lòng thử lại.'


class PayPalClient:
    base_url = 'https://api-m.sandbox.paypal.com'

    def __init__(self):
        self.client_id = os.getenv('PAYPAL_CLIENT_ID', '')
        self.secret = os.getenv('PAYPAL_CLIENT_SECRET', '')
        if os.getenv('PAYPAL_MODE', 'sandbox') != 'sandbox':
            raise PayPalError('Tích hợp đồ án chỉ hỗ trợ PayPal Sandbox.')
        if not self.client_id or not self.secret:
            raise PayPalError('Backend chưa cấu hình khóa PayPal Sandbox.')

    @staticmethod
    def rate():
        try:
            rate = Decimal(os.getenv('PAYPAL_DEMO_VND_PER_USD', '25000'))
            if not rate.is_finite() or rate <= 0:
                raise ValueError
            return rate
        except (InvalidOperation, ValueError):
            raise PayPalError('Tỷ giá demo PayPal không hợp lệ.')

    @staticmethod
    def frontend_url():
        url = os.getenv('PAYPAL_FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        parsed = urlparse(url)
        if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
            raise PayPalError('PAYPAL_FRONTEND_URL phải là địa chỉ gốc của frontend.')
        if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('localhost', '127.0.0.1')):
            raise PayPalError('Frontend phải dùng HTTPS hoặc localhost cho bản demo.')
        return url

    def access_token(self):
        key = 'paypal-sandbox-' + hashlib.sha256((self.client_id + self.secret).encode()).hexdigest()
        token = cache.get(key)
        if token:
            return token
        try:
            response = requests.post(self.base_url + '/v1/oauth2/token', auth=(self.client_id, self.secret),
                                     data={'grant_type': 'client_credentials'}, timeout=(5, 20))
            response.raise_for_status()
            body = response.json()
            token = body['access_token']
            cache.set(key, token, timeout=max(1, int(body.get('expires_in', 300)) - 60))
            return token
        except (requests.RequestException, ValueError, KeyError):
            raise PayPalError('Không xác thực được ứng dụng PayPal Sandbox. Kiểm tra Client ID và Secret trên backend.')

    def request(self, method, path, payload=None, request_id=None):
        headers = {'Authorization': 'Bearer ' + self.access_token(), 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
        if request_id:
            headers['PayPal-Request-Id'] = request_id
        try:
            response = requests.request(method, self.base_url + path, headers=headers, json=payload, timeout=(5, 25))
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError):
            # Never include credentials, access tokens or provider bodies in client errors.
            raise PayPalError()

    def create(self, payload, request_id):
        return self.request('POST', '/v2/checkout/orders', payload, request_id)

    def details(self, order_id):
        if not order_id.isalnum():
            raise PayPalError('Mã giao dịch PayPal không hợp lệ.')
        return self.request('GET', '/v2/checkout/orders/' + order_id)

    def capture(self, order_id, request_id):
        if not order_id.isalnum():
            raise PayPalError('Mã giao dịch PayPal không hợp lệ.')
        return self.request('POST', '/v2/checkout/orders/' + order_id + '/capture', {}, request_id)

    def refund_capture(self, capture_id, amount_usd=None, note='', request_id=None):
        if not capture_id or not str(capture_id).isalnum():
            raise PayPalError('Mã capture PayPal không hợp lệ.')
        payload = {}
        if amount_usd is not None:
            payload['amount'] = {
                'value': f'{Decimal(str(amount_usd)):.2f}',
                'currency_code': 'USD',
            }
        if note:
            payload['note_to_payer'] = str(note).strip()[:255]
        return self.request(
            'POST',
            '/v2/payments/captures/' + str(capture_id) + '/refund',
            payload,
            request_id,
        )

    def verify_webhook(self, event, headers):
        webhook_id = os.getenv('PAYPAL_WEBHOOK_ID', '')
        if not webhook_id:
            raise PayPalError('Chưa cấu hình PAYPAL_WEBHOOK_ID cho webhook Sandbox.')
        names = {'auth_algo': 'PAYPAL-AUTH-ALGO', 'cert_url': 'PAYPAL-CERT-URL',
                 'transmission_id': 'PAYPAL-TRANSMISSION-ID', 'transmission_sig': 'PAYPAL-TRANSMISSION-SIG',
                 'transmission_time': 'PAYPAL-TRANSMISSION-TIME'}
        values = {key: headers.get(name, '') for key, name in names.items()}
        if not all(values.values()):
            return False
        result = self.request('POST', '/v1/notifications/verify-webhook-signature',
                              {**values, 'webhook_id': webhook_id, 'webhook_event': event})
        return result.get('verification_status') == 'SUCCESS'
