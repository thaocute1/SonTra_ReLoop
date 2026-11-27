import hashlib
import hmac
import os
import random
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

import requests
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, ValidationError

from apps.orders.models import OrderItems, OrderVendors, Orders
from apps.payments.models import PaymentTransactions
from .payment_settlement import confirm_transaction_payment, restore_unpaid_booking_benefits

VN_TZ = dt_timezone(timedelta(hours=7))


class VNPayError(APIException):
    status_code = 502
    default_detail = 'Không kết nối được cổng thanh toán VNPAY Sandbox. Vui lòng thử lại.'


def is_configured():
    return bool(os.getenv('VNPAY_TMN_CODE', '').strip() and os.getenv('VNPAY_HASH_SECRET', '').strip())


def _credentials():
    tmn_code = os.getenv('VNPAY_TMN_CODE', '').strip()
    hash_secret = os.getenv('VNPAY_HASH_SECRET', '').strip()
    if not tmn_code or not hash_secret:
        raise VNPayError('Backend chưa cấu hình VNPAY_TMN_CODE và VNPAY_HASH_SECRET.')
    payment_url = (
        os.getenv('VNPAY_PAYMENT_URL', 'https://sandbox.vnpaytest.vn/paymentv2/vpcpay.html').strip()
        or 'https://sandbox.vnpaytest.vn/paymentv2/vpcpay.html'
    )
    api_url = (
        os.getenv('VNPAY_API_URL', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction').strip()
        or 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
    )
    frontend_url = (os.getenv('VNPAY_FRONTEND_URL', 'http://localhost:5173').strip() or 'http://localhost:5173').rstrip('/')
    return tmn_code, hash_secret, payment_url, api_url, frontend_url


def _hmac_sha512(secret, data):
    return hmac.new(secret.encode('utf-8'), data.encode('utf-8'), hashlib.sha512).hexdigest()


def build_query_hash_data(params):
    """Build sorted URL-encoded query string for VNPAY 2.1.0 payment/return/IPN checksum."""
    items = sorted(
        (str(k), str(v))
        for k, v in params.items()
        if str(k).startswith('vnp_')
        and k not in ('vnp_SecureHash', 'vnp_SecureHashType')
        and v is not None
        and str(v) != ''
    )
    return '&'.join(f'{k}={urllib.parse.quote_plus(v)}' for k, v in items)


def verify_signature(params):
    _, hash_secret, _, _, _ = _credentials()
    received_hash = str(params.get('vnp_SecureHash') or '').strip()
    if not received_hash:
        return False
    hash_data = build_query_hash_data(params)
    expected_hash = _hmac_sha512(hash_secret, hash_data)
    return hmac.compare_digest(expected_hash.lower(), received_hash.lower())


def _safe_ip(ip_addr):
    raw = str(ip_addr or '').split(',')[0].strip()
    if not raw or ':' in raw:
        return '127.0.0.1'
    return raw[:45]


def _ascii_info(text):
    import unicodedata
    normalized = unicodedata.normalize('NFKD', str(text or ''))
    ascii_only = normalized.encode('ascii', 'ignore').decode('ascii')
    return ' '.join(ascii_only.split())[:255] or 'Thanh toan don tour'


def owned_order(user, order_id):
    order = Orders.objects.filter(pk=order_id, customer=user).first()
    if not order:
        raise NotFound('Không tìm thấy đơn đặt tour của bạn.')
    return order


def ensure_payable(order):
    if (order.shipping_address or {}).get('payment_method') != 'vnpay':
        raise ValidationError('Đơn này không chọn phương thức VNPAY.')
    if order.payment_status != 'pending':
        raise ValidationError('Đơn này không còn chờ thanh toán.')
    if Decimal(order.grand_total or 0) < Decimal('10000'):
        raise ValidationError('Cổng VNPAY yêu cầu giá trị thanh toán tối thiểu 10.000 đ.')
    if order.expires_at and order.expires_at <= timezone.now():
        raise ValidationError('Đã hết thời gian giữ chỗ. Hãy hủy đơn chờ để trả chỗ rồi đặt lại.')
    rows = list(OrderVendors.objects.filter(order=order).values_list('status', flat=True))
    if not rows or any(state != 'waiting_payment' for state in rows):
        raise ValidationError('Đặt chỗ đã hủy hoặc không còn khả dụng.')


def payment_summary(payment):
    meta = payment.raw_response if isinstance(payment.raw_response, dict) else {}
    return {
        'order_id': payment.order_id,
        'order_code': payment.order.order_code,
        'gateway': 'vnpay',
        'txn_ref': meta.get('txn_ref') or payment.transaction_code,
        'payment_url': meta.get('payment_url'),
        'amount_vnd': str(payment.amount),
        'currency': 'VND',
        'mode': 'sandbox',
        'payment_status': payment.status,
        'order_payment_status': payment.order.payment_status,
        'vnp_transaction_no': meta.get('vnp_TransactionNo'),
        'vnp_bank_code': meta.get('vnp_BankCode'),
        'vnp_card_type': meta.get('vnp_CardType'),
        'vnp_pay_date': meta.get('vnp_PayDate'),
        'vnp_response_code': meta.get('vnp_ResponseCode'),
        'needs_review': meta.get('needs_review'),
        'cancelled': bool(meta.get('cancelled')),
        'expires_at': payment.order.expires_at,
    }


def create_checkout(user, order_id, client_ip='127.0.0.1', bank_code=None):
    tmn_code, hash_secret, payment_url, _, frontend_url = _credentials()
    resolved_bank_code = (
        bank_code if bank_code is not None else os.getenv('VNPAY_BANK_CODE', 'NCB')
    ).strip()

    with transaction.atomic():
        order = Orders.objects.select_for_update().get(pk=owned_order(user, order_id).pk)
        ensure_payable(order)
        payment = PaymentTransactions.objects.filter(order=order, payment_gateway='vnpay').first()
        now_vn = datetime.now(VN_TZ)
        expire_vn = (
            order.expires_at.astimezone(VN_TZ)
            if order.expires_at and order.expires_at > timezone.now()
            else now_vn + timedelta(minutes=15)
        )
        txn_ref = f"VNP{order.id}{now_vn.strftime('%H%M%S')}{random.randint(10, 99)}"
        create_date = now_vn.strftime('%Y%m%d%H%M%S')
        expire_date = expire_vn.strftime('%Y%m%d%H%M%S')

        vnp_params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': tmn_code,
            'vnp_Amount': int(Decimal(order.grand_total) * 100),
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': txn_ref,
            'vnp_OrderInfo': _ascii_info(f'Thanh toan don tour {order.order_code}'),
            'vnp_OrderType': 'other',
            'vnp_Locale': 'vn',
            'vnp_ReturnUrl': f'{frontend_url}/payment/vnpay/return?order_id={order.id}',
            'vnp_IpAddr': _safe_ip(client_ip),
            'vnp_CreateDate': create_date,
            'vnp_ExpireDate': expire_date,
        }
        if resolved_bank_code:
            vnp_params['vnp_BankCode'] = resolved_bank_code
        query_string = build_query_hash_data(vnp_params)
        secure_hash = _hmac_sha512(hash_secret, query_string)
        checkout_url = f'{payment_url}?{query_string}&vnp_SecureHash={secure_hash}'

        meta = {
            'txn_ref': txn_ref,
            'create_date': create_date,
            'expire_date': expire_date,
            'payment_url': checkout_url,
            'cancelled': False,
        }
        if not payment:
            payment = PaymentTransactions.objects.create(
                order=order,
                payment_gateway='vnpay',
                transaction_code=txn_ref,
                amount=order.grand_total,
                status='pending',
                raw_response=meta,
            )
        else:
            existing_meta = dict(payment.raw_response or {})
            if payment.status == 'paid' or existing_meta.get('needs_review'):
                raise ValidationError('Giao dịch này đã được thanh toán hoặc đang đối soát.')
            payment.transaction_code = txn_ref
            payment.status = 'pending'
            payment.raw_response = {**existing_meta, **meta}
            payment.save(update_fields=['transaction_code', 'status', 'raw_response', 'updated_at'])

        payment.order = order
        return payment_summary(payment)


def _apply_vnpay_result(payment, params):
    """Apply verified VNPAY parameters to PaymentTransactions & Orders idempotently."""
    tmn_code, _, _, _, _ = _credentials()
    if str(params.get('vnp_TmnCode') or '').strip() != tmn_code:
        raise ValidationError('Mã định danh merchant VNPAY không khớp.')

    try:
        received_amount = int(str(params.get('vnp_Amount') or '0'))
    except ValueError:
        raise ValidationError('Số tiền VNPAY không hợp lệ.')
    expected_amount = int(Decimal(payment.amount) * 100)
    if received_amount != expected_amount:
        raise ValidationError('Số tiền thanh toán VNPAY không khớp đơn hàng.')

    resp_code = str(params.get('vnp_ResponseCode') or '')
    tx_status = str(params.get('vnp_TransactionStatus') or resp_code)
    provider_meta = {
        **(payment.raw_response if isinstance(payment.raw_response, dict) else {}),
        'vnp_TransactionNo': str(params.get('vnp_TransactionNo') or ''),
        'vnp_BankCode': str(params.get('vnp_BankCode') or ''),
        'vnp_BankTranNo': str(params.get('vnp_BankTranNo') or ''),
        'vnp_CardType': str(params.get('vnp_CardType') or ''),
        'vnp_PayDate': str(params.get('vnp_PayDate') or ''),
        'vnp_ResponseCode': resp_code,
        'vnp_TransactionStatus': tx_status,
    }

    if resp_code == '00' and tx_status == '00':
        confirm_transaction_payment(payment, provider_data=provider_meta, protect_lifecycle=True)
    else:
        with transaction.atomic():
            locked = PaymentTransactions.objects.select_for_update().get(pk=payment.pk)
            if locked.status != 'paid':
                locked.status = 'failed'
                locked.raw_response = {**(locked.raw_response or {}), **provider_meta}
                locked.save(update_fields=['status', 'raw_response', 'updated_at'])

    payment.refresh_from_db()
    payment.order.refresh_from_db()
    return payment


def confirm_return(user, params):
    if not verify_signature(params):
        raise ValidationError('Chữ ký xác thực VNPAY không hợp lệ.')
    txn_ref = str(params.get('vnp_TxnRef') or '').strip()
    if not txn_ref:
        raise ValidationError('Thiếu mã giao dịch VNPAY (vnp_TxnRef).')

    payment = (
        PaymentTransactions.objects.filter(
            payment_gateway='vnpay',
            transaction_code=txn_ref,
            order__customer=user,
        )
        .select_related('order')
        .first()
    )
    if not payment:
        raise NotFound('Không tìm thấy giao dịch VNPAY của bạn.')

    payment = _apply_vnpay_result(payment, params)
    return payment_summary(payment)


def process_ipn(params):
    """Handle VNPAY server-to-server IPN callback with official RspCode contract."""
    if not verify_signature(params):
        return {'RspCode': '97', 'Message': 'Invalid Checksum'}

    txn_ref = str(params.get('vnp_TxnRef') or '').strip()
    payment = (
        PaymentTransactions.objects.filter(payment_gateway='vnpay', transaction_code=txn_ref)
        .select_related('order')
        .first()
    )
    if not payment:
        return {'RspCode': '01', 'Message': 'Order not Found'}

    try:
        received_amount = int(str(params.get('vnp_Amount') or '0'))
    except ValueError:
        return {'RspCode': '04', 'Message': 'Invalid amount'}
    if received_amount != int(Decimal(payment.amount) * 100):
        return {'RspCode': '04', 'Message': 'Invalid amount'}

    if payment.status == 'paid':
        return {'RspCode': '02', 'Message': 'Order already confirmed'}

    _apply_vnpay_result(payment, params)
    return {'RspCode': '00', 'Message': 'Confirm Success'}


def get_order_status(user, order_id):
    payment = (
        PaymentTransactions.objects.filter(
            payment_gateway='vnpay',
            order_id=order_id,
            order__customer=user,
        )
        .select_related('order')
        .order_by('-id')
        .first()
    )
    if payment:
        return payment_summary(payment)

    order = owned_order(user, order_id)
    return {
        'order_id': order.id,
        'order_code': order.order_code,
        'gateway': 'vnpay',
        'payment_status': 'paid' if order.payment_status == 'paid' else 'pending',
        'order_payment_status': order.payment_status,
        'amount_vnd': str(order.grand_total),
        'currency': 'VND',
        'cancelled': order.payment_status == 'cancelled',
        'expires_at': order.expires_at,
    }


def cancel_checkout(user, order_id):
    with transaction.atomic():
        order = Orders.objects.select_for_update().get(pk=owned_order(user, order_id).pk)
        payment = (
            PaymentTransactions.objects.select_for_update()
            .filter(order=order, payment_gateway='vnpay')
            .order_by('-id')
            .first()
        )
        meta = dict(payment.raw_response or {}) if payment else {}
        if (payment and meta.get('cancelled')) or order.payment_status in ('cancelled', 'failed'):
            if payment:
                payment.order = order
                return payment_summary(payment)
            return {
                'order_id': order.id,
                'order_code': order.order_code,
                'gateway': 'vnpay',
                'payment_status': 'failed',
                'order_payment_status': order.payment_status,
                'cancelled': True,
                'expires_at': order.expires_at,
            }
        if order.payment_status == 'paid' or (payment and payment.status == 'paid'):
            raise ValidationError('Đơn đã thanh toán, không thể hủy qua thao tác này.')

        vendors = list(OrderVendors.objects.select_for_update().filter(order=order))
        from apps.tours.models import TourSchedules
        from apps.flash_sales.models import CampaignItems

        campaign_item_ids = []
        for item in OrderItems.objects.filter(order_vendor__in=vendors):
            qty = max(1, int(item.quantity or 1))
            if getattr(item, 'tour_schedule_id', None):
                sch = TourSchedules.objects.select_for_update().filter(id=item.tour_schedule_id).first()
                if sch:
                    sch.booked_count = max(0, (sch.booked_count or 0) - qty)
                    rem = max(0, (sch.max_capacity or 0) - sch.booked_count)
                    if sch.status != 'cancelled':
                        sch.status = 'full' if rem <= 0 else ('almost_full' if rem <= 3 else 'open')
                    sch.save(update_fields=['booked_count', 'status', 'updated_at'])
            if getattr(item, 'campaign_item_id', None):
                ci = CampaignItems.objects.select_for_update().filter(id=item.campaign_item_id).first()
                if ci:
                    ci.sold_quantity = max(0, (ci.sold_quantity or 0) - qty)
                    ci.save(update_fields=['sold_quantity', 'updated_at'])
                    campaign_item_ids.append(ci.id)

        restore_unpaid_booking_benefits(order, vendors, campaign_item_ids=campaign_item_ids)
        OrderVendors.objects.filter(order=order).exclude(status='cancelled').update(
            status='cancelled',
            cancellation_reason='Khách hủy thanh toán VNPAY',
        )
        order.payment_status = 'cancelled'
        order.save(update_fields=['payment_status', 'updated_at'])

        if payment:
            payment.status = 'failed'
            payment.raw_response = {**meta, 'cancelled': True}
            payment.save(update_fields=['status', 'raw_response', 'updated_at'])
            payment.order = order
            return payment_summary(payment)

        return {
            'order_id': order.id,
            'order_code': order.order_code,
            'gateway': 'vnpay',
            'payment_status': 'failed',
            'order_payment_status': order.payment_status,
            'cancelled': True,
            'expires_at': order.expires_at,
        }


def refund_transaction(payment, amount_vnd, create_by='bql_admin', order_info='Hoan tien don tour',
                       client_ip='127.0.0.1', request_id=None):
    """
    Call VNPAY 2.1.0 Refund API (pipe-separated HMAC-SHA512 checksum).
    Supports VNPAY_REFUND_MODE=mock for demos if VNPAY Sandbox has not enabled refund API for the merchant.
    """
    tmn_code, hash_secret, _, api_url, _ = _credentials()
    meta = payment.raw_response if isinstance(payment.raw_response, dict) else {}
    txn_ref = str(meta.get('txn_ref') or payment.transaction_code)
    txn_no = str(meta.get('vnp_TransactionNo') or '')
    txn_date = str(meta.get('vnp_PayDate') or meta.get('create_date') or '')
    if not txn_date:
        txn_date = payment.created_at.astimezone(VN_TZ).strftime('%Y%m%d%H%M%S')

    req_id = str(request_id or uuid.uuid4().hex[:20])
    amount_int = int(Decimal(amount_vnd))
    vnp_amount = amount_int * 100
    full_amount = int(Decimal(payment.amount))
    txn_type = '02' if amount_int >= full_amount else '03'
    create_date = datetime.now(VN_TZ).strftime('%Y%m%d%H%M%S')
    clean_info = _ascii_info(order_info)
    ip = _safe_ip(client_ip)
    actor = _ascii_info(create_by).replace(' ', '_')[:50] or 'admin'

    mode = (os.getenv('VNPAY_REFUND_MODE', 'sandbox') or 'sandbox').strip().lower()
    if mode == 'mock':
        return {
            'mode': 'vnpay_mock',
            'refund_reference': f'VNPAY-MOCK-{req_id[:12].upper()}',
            'response': {'vnp_ResponseCode': '00', 'vnp_Message': 'Mock VNPAY Refund Success'},
        }

    hash_parts = [
        req_id,
        '2.1.0',
        'refund',
        tmn_code,
        txn_type,
        txn_ref,
        str(vnp_amount),
        txn_no,
        txn_date,
        actor,
        create_date,
        ip,
        clean_info,
    ]
    secure_hash = _hmac_sha512(hash_secret, '|'.join(hash_parts))

    payload = {
        'vnp_RequestId': req_id,
        'vnp_Version': '2.1.0',
        'vnp_Command': 'refund',
        'vnp_TmnCode': tmn_code,
        'vnp_TransactionType': txn_type,
        'vnp_TxnRef': txn_ref,
        'vnp_Amount': vnp_amount,
        'vnp_OrderInfo': clean_info,
        'vnp_TransactionDate': txn_date,
        'vnp_CreateBy': actor,
        'vnp_CreateDate': create_date,
        'vnp_IpAddr': ip,
        'vnp_SecureHash': secure_hash,
    }
    if txn_no:
        payload['vnp_TransactionNo'] = txn_no

    try:
        resp = requests.post(api_url, json=payload, timeout=(5, 25))
    except requests.RequestException as exc:
        raise VNPayError(
            f'Không thể kết nối máy chủ hoàn tiền VNPAY Sandbox ({exc.__class__.__name__}). '
            'Kiểm tra lại kết nối mạng hoặc VNPAY_API_URL.'
        )

    try:
        body = resp.json()
    except ValueError:
        raise VNPayError(
            f'Máy chủ hoàn tiền VNPAY Sandbox trả về dữ liệu không hợp lệ (HTTP {resp.status_code}). '
            'Kiểm tra VNPAY_API_URL (chuẩn: https://sandbox.vnpayment.vn/merchant_webapi/api/transaction) '
            'hoặc đặt VNPAY_REFUND_MODE=mock nếu tài khoản test chưa được VNPAY mở API hoàn tiền.'
        )

    resp_code = str(body.get('vnp_ResponseCode') or '')
    if resp.status_code != 200 or resp_code != '00':
        msg = body.get('vnp_Message') or f'VNPAY từ chối hoàn tiền (mã {resp_code or resp.status_code}).'
        raise VNPayError(msg)

    return {
        'mode': 'vnpay_sandbox',
        'refund_reference': str(body.get('vnp_TransactionNo') or body.get('vnp_TxnRef') or req_id),
        'response': body,
    }
