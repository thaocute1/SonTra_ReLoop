import uuid
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from urllib.parse import urlparse
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from apps.orders.models import Orders, OrderVendors, OrderItems
from apps.payments.models import PaymentTransactions
from .paypal_client import PayPalClient, PayPalError
from .payment_settlement import confirm_transaction_payment, restore_unpaid_booking_benefits


def owned_order(user, order_id):
    order = Orders.objects.filter(pk=order_id, customer=user).first()
    if not order:
        raise NotFound('Không tìm thấy đơn đặt tour của bạn.')
    return order


def ensure_payable(order):
    if (order.shipping_address or {}).get('payment_method') != 'paypal':
        raise ValidationError('Đơn này không chọn phương thức PayPal.')
    if order.payment_status != 'pending':
        raise ValidationError('Đơn này không còn chờ thanh toán.')
    if order.expires_at and order.expires_at <= timezone.now():
        raise ValidationError('Đã hết thời gian giữ chỗ. Hãy hủy đơn chờ để trả chỗ rồi đặt lại.')
    rows = list(OrderVendors.objects.filter(order=order).values_list('status', flat=True))
    if not rows or any(state != 'waiting_payment' for state in rows):
        raise ValidationError('Đặt chỗ đã hủy hoặc không còn khả dụng.')


def payment_summary(payment):
    meta = payment.raw_response or {}
    return {
        'order_id': payment.order_id, 'order_code': payment.order.order_code,
        'paypal_order_id': meta.get('paypal_order_id'), 'approval_url': meta.get('approval_url'),
        'amount_vnd': str(payment.amount), 'amount_usd': meta.get('amount_usd'),
        'currency': 'USD', 'fx_vnd_per_usd': meta.get('fx_vnd_per_usd'), 'mode': 'sandbox',
        'payment_status': payment.status, 'order_payment_status': payment.order.payment_status,
        'needs_review': meta.get('needs_review'), 'capture_id': meta.get('capture_id'),
        'cancelled': bool(meta.get('cancelled')), 'expires_at': payment.order.expires_at,
    }


def create_checkout(user, order_id):
    client = PayPalClient()
    with transaction.atomic():
        order = Orders.objects.select_for_update().get(pk=owned_order(user, order_id).pk)
        ensure_payable(order)
        payment = PaymentTransactions.objects.filter(order=order, payment_gateway='paypal').first()
        if not payment:
            rate = client.rate()
            usd = (order.grand_total / rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if usd < Decimal('0.01'):
                raise ValidationError('Giá trị đơn quá nhỏ để thanh toán USD.')
            payment = PaymentTransactions.objects.create(
                order=order, payment_gateway='paypal', transaction_code=f'paypal-pending-{order.id}',
                amount=order.grand_total, status='pending', raw_response={
                    'amount_usd': str(usd), 'currency': 'USD', 'fx_vnd_per_usd': str(rate),
                    'create_request_id': str(uuid.uuid4()), 'capture_request_id': str(uuid.uuid4()),
                },
            )
        meta = payment.raw_response or {}
        if payment.status != 'pending' or meta.get('cancelled') or meta.get('needs_review'):
            raise ValidationError('Giao dịch này không còn khả dụng.')
        if meta.get('paypal_order_id') and meta.get('approval_url'):
            return payment_summary(payment)
    # Provider calls are outside DB transactions. Repeated calls use the SAME request ID.
    origin = client.frontend_url()
    body = client.create({
        'intent': 'CAPTURE',
        'purchase_units': [{'reference_id': str(order.id), 'custom_id': str(order.id),
                            'invoice_id': 'STRL-' + order.order_code,
                            'amount': {'currency_code': 'USD', 'value': meta['amount_usd']}}],
        'payment_source': {'paypal': {'experience_context': {
            'brand_name': 'Son Tra ReLoop Demo', 'user_action': 'PAY_NOW', 'shipping_preference': 'NO_SHIPPING',
            'return_url': f'{origin}/payment/paypal/return?order_id={order.id}',
            'cancel_url': f'{origin}/payment/paypal/cancel?order_id={order.id}',
        }}},
    }, meta['create_request_id'])
    provider_id = body.get('id', '')
    approval_url = next((row.get('href', '') for row in body.get('links', []) if row.get('rel') in ('payer-action', 'approve')), '')
    url = urlparse(approval_url)
    if not provider_id.isalnum() or url.scheme != 'https' or url.hostname not in ('www.sandbox.paypal.com', 'sandbox.paypal.com'):
        raise PayPalError('PayPal chưa trả về liên kết checkout Sandbox hợp lệ.')
    with transaction.atomic():
        payment = PaymentTransactions.objects.select_for_update(of=('self',)).select_related('order').get(pk=payment.pk)
        payment.transaction_code = provider_id
        payment.raw_response = {**(payment.raw_response or {}), 'paypal_order_id': provider_id,
                                'approval_url': approval_url, 'create_response': body}
        payment.save(update_fields=['transaction_code', 'raw_response', 'updated_at'])
    return payment_summary(payment)


def owned_payment(user, provider_id=None, order_id=None):
    rows = PaymentTransactions.objects.filter(payment_gateway='paypal', order__customer=user).select_related('order')
    payment = rows.filter(transaction_code=provider_id).first() if provider_id else rows.filter(order_id=order_id).first()
    if not payment:
        raise NotFound('Không tìm thấy giao dịch PayPal của bạn.')
    return payment


def accept_provider_result(payment, body):
    """Only authenticated PayPal API responses, never browser-supplied payment data."""
    meta = payment.raw_response or {}
    units = body.get('purchase_units', [])
    if body.get('id') != meta.get('paypal_order_id') or len(units) != 1:
        raise PayPalError('Kết quả PayPal không khớp giao dịch đã lưu.')
    unit = units[0]
    if unit.get('reference_id') != str(payment.order_id) or unit.get('custom_id') != str(payment.order_id):
        raise PayPalError('Mã tham chiếu PayPal không khớp đơn hàng.')
    expected_merchant = (((meta.get('create_response') or {}).get('purchase_units') or [{}])[0].get('payee') or {}).get('merchant_id')
    if expected_merchant and (unit.get('payee') or {}).get('merchant_id') != expected_merchant:
        raise PayPalError('Tài khoản nhận tiền không khớp.')
    captures = unit.get('payments', {}).get('captures', [])
    if not captures:
        return False
    if len(captures) != 1:
        raise PayPalError('Giao dịch có nhiều capture, cần đối soát.')
    capture = captures[0]
    amount = capture.get('amount', {})
    try:
        matched = amount.get('currency_code') == 'USD' and Decimal(amount.get('value', 'NaN')) == Decimal(meta['amount_usd'])
    except (InvalidOperation, KeyError, TypeError):
        matched = False
    if not matched:
        raise PayPalError('Số tiền hoặc loại tiền PayPal không khớp đơn hàng.')
    if capture.get('status') != 'COMPLETED' or body.get('status') != 'COMPLETED':
        return False
    capture_id = capture.get('id')
    if not capture_id:
        raise PayPalError('PayPal chưa cung cấp mã capture.')
    # Merge under lock so concurrent webhooks cannot overwrite confirmation/review metadata.
    with transaction.atomic():
        locked = PaymentTransactions.objects.select_for_update().get(pk=payment.pk)
        locked.raw_response = {**(locked.raw_response or {}), 'capture_id': capture_id}
        locked.save(update_fields=['raw_response', 'updated_at'])
    confirm_transaction_payment(payment, body, protect_lifecycle=True)
    return True


def capture_checkout(user, provider_id):
    payment = owned_payment(user, provider_id=provider_id)
    if payment.status == 'paid':
        return payment_summary(payment)
    client = PayPalClient()
    body = client.details(provider_id)
    if not accept_provider_result(payment, body):
        ensure_payable(payment.order)
        # A pending capture must be reconciled, not captured again with a new ID.
        captures = body.get('purchase_units', [{}])[0].get('payments', {}).get('captures', [])
        if body.get('status') == 'APPROVED' and not captures:
            client.capture(provider_id, payment.raw_response['capture_request_id'])
            body = client.details(provider_id)
            accept_provider_result(payment, body)
        elif body.get('status') not in ('APPROVED', 'COMPLETED'):
            raise ValidationError('Bạn chưa chấp thuận thanh toán trên PayPal.')
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    return payment_summary(payment)


def reconcile_checkout(user, order_id):
    payment = owned_payment(user, order_id=order_id)
    meta = payment.raw_response or {}
    if payment.status != 'paid' and meta.get('paypal_order_id') and not meta.get('cancelled'):
        accept_provider_result(payment, PayPalClient().details(meta['paypal_order_id']))
        payment.refresh_from_db()
        payment.order.refresh_from_db()
    return payment_summary(payment)


def cancel_checkout(user, order_id):
    payment = (
        PaymentTransactions.objects.filter(
            payment_gateway='paypal', order__customer=user, order_id=order_id
        )
        .select_related('order')
        .first()
    )
    if not payment:
        owned_order(user, order_id)
    meta = (payment.raw_response or {}) if payment else {}
    if payment and meta.get('paypal_order_id') and payment.status != 'paid':
        accept_provider_result(payment, PayPalClient().details(meta['paypal_order_id']))
    with transaction.atomic():
        order = Orders.objects.select_for_update().get(pk=order_id)
        if payment:
            payment = PaymentTransactions.objects.select_for_update().get(pk=payment.pk)
            meta = payment.raw_response or {}
        if order.payment_status == 'paid' or (payment and payment.status == 'paid'):
            raise ValidationError('Đơn đã ghi nhận tiền, không thể hủy như đơn chưa thanh toán.')
        if (payment and meta.get('cancelled')) or order.payment_status in ('cancelled', 'failed'):
            return payment_summary(payment) if payment else {
                'order_id': order.id, 'order_code': order.order_code,
                'payment_status': 'failed', 'order_payment_status': order.payment_status,
                'cancelled': True, 'expires_at': order.expires_at,
            }
        # Release only reservations still owned by this unpaid order; retry cannot release twice.
        from apps.tours.models import TourSchedules
        from apps.flash_sales.models import CampaignItems
        rows = list(OrderVendors.objects.select_for_update().filter(order=order).order_by('id'))
        waiting_rows = [row for row in rows if row.status == 'waiting_payment']
        items = OrderItems.objects.filter(order_vendor__in=waiting_rows).order_by('tour_schedule_id', 'campaign_item_id', 'id')
        released_campaign_ids = []
        for item in items:
            if item.tour_schedule_id:
                schedule = TourSchedules.objects.select_for_update().get(pk=item.tour_schedule_id)
                schedule.booked_count = max(0, schedule.booked_count - item.quantity)
                remaining = max(0, (schedule.max_capacity or 0) - schedule.booked_count)
                if schedule.status != 'cancelled':
                    schedule.status = 'full' if remaining <= 0 else ('almost_full' if remaining <= 3 else 'open')
                schedule.save(update_fields=['booked_count', 'status'])
            if item.campaign_item_id:
                campaign_item = CampaignItems.objects.select_for_update().get(pk=item.campaign_item_id)
                campaign_item.sold_quantity = max(0, campaign_item.sold_quantity - item.quantity)
                campaign_item.save(update_fields=['sold_quantity'])
                released_campaign_ids.append(item.campaign_item_id)
        restore_unpaid_booking_benefits(order, waiting_rows, campaign_item_ids=released_campaign_ids)
        OrderVendors.objects.filter(pk__in=[row.id for row in waiting_rows]).update(
            status='cancelled',
            cancellation_reason='Khách hủy thanh toán PayPal',
        )
        order.payment_status = 'cancelled'
        order.expires_at = timezone.now()
        order.save(update_fields=['payment_status', 'expires_at', 'updated_at'])
        if payment:
            payment.status = 'failed'
            payment.raw_response = {**meta, 'cancelled': True}
            payment.save(update_fields=['status', 'raw_response', 'updated_at'])
            payment.order = order
            return payment_summary(payment)
        return {
            'order_id': order.id, 'order_code': order.order_code,
            'payment_status': 'failed', 'order_payment_status': order.payment_status,
            'cancelled': True, 'expires_at': order.expires_at,
        }


def process_webhook(event, headers):
    if not PayPalClient().verify_webhook(event, headers):
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('Chữ ký webhook PayPal không hợp lệ.')
    resource = event.get('resource') or {}
    related = (resource.get('supplementary_data') or {}).get('related_ids') or {}
    provider_id = related.get('order_id')
    payment = PaymentTransactions.objects.filter(payment_gateway='paypal', transaction_code=provider_id).first() if provider_id else None
    if not payment:
        capture_id = related.get('capture_id') or resource.get('id')
        payment = PaymentTransactions.objects.filter(payment_gateway='paypal', raw_response__capture_id=capture_id).first() if capture_id else None
    if not payment:
        return 'ignored'
    kind = event.get('event_type')
    if kind == 'PAYMENT.CAPTURE.COMPLETED':
        accept_provider_result(payment, PayPalClient().details(payment.raw_response['paypal_order_id']))
    with transaction.atomic():
        payment = PaymentTransactions.objects.select_for_update().get(pk=payment.pk)
        meta = payment.raw_response or {}
        events = meta.get('webhook_event_ids', [])
        if event.get('id') not in events:
            events.append(event.get('id'))
        meta['webhook_event_ids'] = events[-50:]
        if kind in ('PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'):
            meta['external_refunded'] = True
            meta['needs_review'] = 'PayPal thông báo hoàn tiền/đảo giao dịch. BQL cần đối soát và xử lý đơn.'
        payment.raw_response = meta
        payment.save(update_fields=['raw_response', 'updated_at'])
    return 'processed'
