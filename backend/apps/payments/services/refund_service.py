from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.utils import timezone

from apps.orders.models import OrderItems, OrderVendors
from apps.payments.models import LedgerEntries, PaymentTransactions
from apps.payments.services.payment_settlement import restore_unpaid_booking_benefits
from apps.payments.services.payos_service import PayOSService
from apps.payments.services.paypal_client import PayPalClient
from apps.payments.services import vnpay_service


REFUND_STATUS_LABELS = {
    'none': 'Không có',
    'requested': 'Chờ duyệt hoàn tiền',
    'in_review': 'Đang xem xét',
    'approved': 'Đã duyệt hoàn tiền',
    'refunded': 'Đã hoàn tiền',
    'rejected': 'Từ chối hoàn tiền',
}


def _detect_payment_transaction(order):
    return (
        PaymentTransactions.objects.filter(order=order, status='paid')
        .order_by('-id')
        .first()
    )


def _detect_gateway(order, paid_tx=None):
    if paid_tx and paid_tx.payment_gateway:
        return paid_tx.payment_gateway
    shipping = order.shipping_address if isinstance(order.shipping_address, dict) else {}
    return shipping.get('payment_method') or 'payos'


def request_customer_refund(customer, order_vendor_id, reason, bank_info=None):
    """Customer submits a cancellation & refund request for a paid booking."""
    if not customer or not getattr(customer, 'is_authenticated', False):
        raise ValueError('Vui lòng đăng nhập để thực hiện thao tác này.')

    clean_reason = (reason or '').strip()
    if not clean_reason:
        raise ValueError('Vui lòng nhập lý do hủy và hoàn tiền.')

    bank_info = bank_info if isinstance(bank_info, dict) else {}

    with transaction.atomic():
        ov = (
            OrderVendors.objects.select_for_update()
            .select_related('order', 'vendor')
            .filter(id=int(order_vendor_id), order__customer=customer)
            .first()
        )
        if not ov:
            raise ValueError('Không tìm thấy đơn đặt chỗ của bạn.')
        if ov.order.payment_status != 'paid':
            raise ValueError('Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán.')
        if ov.status != 'confirmed':
            raise ValueError('Chỉ đơn đang ở trạng thái Đã xác nhận mới có thể yêu cầu hoàn tiền.')
        if ov.refund_status not in ('none', 'rejected'):
            raise ValueError('Đơn này đã có yêu cầu hoàn tiền đang được xử lý hoặc đã hoàn.')

        paid_tx = _detect_payment_transaction(ov.order)
        gateway = _detect_gateway(ov.order, paid_tx)

        if gateway not in ('paypal', 'vnpay'):
            bank_bin = str(bank_info.get('bank_bin') or '').strip()
            bank_name = str(bank_info.get('bank_name') or '').strip()
            account_number = str(bank_info.get('account_number') or '').strip()
            account_holder = str(bank_info.get('account_holder') or '').strip()
            if not account_number or not account_holder or not (bank_bin or bank_name):
                raise ValueError(
                    'Vui lòng nhập đầy đủ ngân hàng, số tài khoản và tên chủ tài khoản nhận tiền hoàn.'
                )
            shipping = dict(ov.order.shipping_address or {})
            shipping['refund_bank_info'] = {
                'bank_bin': bank_bin,
                'bank_name': bank_name,
                'account_number': account_number,
                'account_holder': account_holder,
            }
            ov.order.shipping_address = shipping
            ov.order.save(update_fields=['shipping_address', 'updated_at'])

        now = timezone.now()
        ov.refund_status = 'requested'
        ov.refund_reason = clean_reason
        ov.cancellation_reason = clean_reason
        ov.refund_requested_at = now
        ov.save(
            update_fields=[
                'refund_status',
                'refund_reason',
                'cancellation_reason',
                'refund_requested_at',
                'updated_at',
            ]
        )

        LedgerEntries.objects.filter(
            order_vendor=ov,
            payout_status='recorded',
        ).update(payout_status='on_hold')

    return {
        'id': ov.id,
        'refund_status': ov.refund_status,
        'refund_status_label': REFUND_STATUS_LABELS[ov.refund_status],
        'refund_reason': ov.refund_reason,
        'refund_requested_at': ov.refund_requested_at.isoformat() if ov.refund_requested_at else None,
    }


def list_admin_refunds():
    """Return all refund requests / processed refunds and flagged PayPal transactions for BQL."""
    flagged_order_ids = set()
    tx_by_order = {}
    for tx in PaymentTransactions.objects.order_by('-id'):
        tx_by_order.setdefault(tx.order_id, tx)
        meta = tx.raw_response if isinstance(tx.raw_response, dict) else {}
        if meta.get('needs_review'):
            flagged_order_ids.add(tx.order_id)

    qs = (
        OrderVendors.objects.select_related('order', 'order__customer', 'vendor')
        .prefetch_related('orderitems_set__tour')
        .order_by('-refund_requested_at', '-id')
    )

    rows = []
    for ov in qs:
        if ov.refund_status == 'none' and ov.order_id not in flagged_order_ids:
            continue

        order = ov.order
        shipping = order.shipping_address if isinstance(order.shipping_address, dict) else {}
        items = list(ov.orderitems_set.all())
        tour_title = items[0].tour.title if items and items[0].tour else 'Tour Sinh Thái Sơn Trà'
        tx = tx_by_order.get(order.id)
        gateway = _detect_gateway(order, tx)
        meta = tx.raw_response if tx and isinstance(tx.raw_response, dict) else {}

        rows.append({
            'id': ov.id,
            'order_vendor_id': ov.id,
            'order_id': order.id,
            'order_code': order.order_code,
            'tour_title': tour_title,
            'vendor_name': ov.vendor.brand_name if ov.vendor else 'Đối tác Sơn Trà',
            'customer_name': shipping.get('customer_name') or (order.customer.name if order.customer else 'Du khách'),
            'customer_email': shipping.get('customer_email') or (order.customer.email if order.customer else ''),
            'customer_phone': shipping.get('customer_phone') or (order.customer.phone if order.customer else ''),
            'scheduled_date': ov.scheduled_date.strftime('%d/%m/%Y') if ov.scheduled_date else '',
            'subtotal': int(ov.subtotal or 0),
            'subtotal_formatted': f"{int(ov.subtotal or 0):,} VNĐ".replace(',', '.'),
            'refunded_amount': int(ov.refunded_amount or 0),
            'refunded_amount_formatted': f"{int(ov.refunded_amount or 0):,} VNĐ".replace(',', '.'),
            'status': ov.status,
            'refund_status': ov.refund_status,
            'refund_status_label': REFUND_STATUS_LABELS.get(ov.refund_status, ov.refund_status),
            'refund_reason': ov.refund_reason or ov.cancellation_reason or '',
            'refund_requested_at': ov.refund_requested_at.isoformat() if ov.refund_requested_at else None,
            'refunded_at': ov.refunded_at.isoformat() if ov.refunded_at else None,
            'payment_gateway': gateway,
            'refund_bank_info': shipping.get('refund_bank_info') or None,
            'needs_review': meta.get('needs_review') or '',
            'refund_reference': meta.get('refund_reference') or '',
            'refund_provider_mode': meta.get('refund_provider_mode') or '',
        })

    return {
        'total': len(rows),
        'pending_count': sum(1 for r in rows if r['refund_status'] in ('requested', 'in_review', 'approved')),
        'refunded_count': sum(1 for r in rows if r['refund_status'] == 'refunded'),
        'results': rows,
    }


def _release_booking_slots(ov):
    from apps.tours.models import TourSchedules
    from apps.tours.models.tour_models import BOOKABLE_SCHEDULE_STATUSES
    from apps.flash_sales.models import CampaignItems

    campaign_item_ids = []
    for item in OrderItems.objects.filter(order_vendor=ov):
        qty = max(1, int(item.quantity or 1))
        if getattr(item, 'tour_schedule_id', None):
            sch = TourSchedules.objects.select_for_update().filter(id=item.tour_schedule_id).first()
            if sch:
                sch.booked_count = max(0, (sch.booked_count or 0) - qty)
                new_rem = max(0, (sch.max_capacity or 0) - sch.booked_count)
                if sch.status in (*BOOKABLE_SCHEDULE_STATUSES, 'full'):
                    sch.status = 'full' if new_rem <= 0 else ('almost_full' if new_rem <= 3 else 'open')
                sch.save(update_fields=['booked_count', 'status', 'updated_at'])
        if getattr(item, 'campaign_item_id', None):
            ci = CampaignItems.objects.select_for_update().filter(id=item.campaign_item_id).first()
            if ci:
                ci.sold_quantity = max(0, (ci.sold_quantity or 0) - qty)
                ci.save(update_fields=['sold_quantity', 'updated_at'])
                campaign_item_ids.append(ci.id)
    return campaign_item_ids


def process_admin_refund(order_vendor_id, decision, admin_note='', amount_vnd=None):
    """BQL approves or rejects a refund request, calling PayPal Sandbox or PayOS Payout."""
    if decision not in ('approve', 'reject'):
        raise ValueError('Quyết định xử lý phải là approve hoặc reject.')

    clean_note = (admin_note or '').strip()

    with transaction.atomic():
        ov = (
            OrderVendors.objects.select_for_update()
            .select_related('order', 'order__customer')
            .filter(id=int(order_vendor_id))
            .first()
        )
        if not ov:
            raise ValueError('Không tìm thấy đơn đặt chỗ cần xử lý hoàn tiền.')
        if ov.refund_status == 'refunded':
            raise ValueError('Đơn đặt chỗ này đã được hoàn tiền trước đó.')

        paid_tx = _detect_payment_transaction(ov.order)
        tx_meta = dict(paid_tx.raw_response or {}) if paid_tx else {}
        has_review_flag = bool(tx_meta.get('needs_review'))

        if ov.refund_status not in ('requested', 'in_review', 'approved') and not has_review_flag:
            raise ValueError('Đơn này chưa có yêu cầu hoàn tiền hợp lệ để xử lý.')

        if decision == 'reject':
            ov.refund_status = 'rejected'
            if clean_note:
                base_reason = (ov.refund_reason or '').strip()
                ov.refund_reason = f"{base_reason}\n[BQL từ chối]: {clean_note}".strip()
            ov.save(update_fields=['refund_status', 'refund_reason', 'updated_at'])
            LedgerEntries.objects.filter(
                order_vendor=ov,
                payout_status='on_hold',
            ).update(payout_status='recorded')
            return {
                'success': True,
                'id': ov.id,
                'refund_status': ov.refund_status,
                'refund_status_label': REFUND_STATUS_LABELS[ov.refund_status],
                'message': f'Đã từ chối yêu cầu hoàn tiền cho đơn #{ov.order.order_code}.',
            }

        max_refundable = Decimal(ov.subtotal or 0)
        if amount_vnd is not None and str(amount_vnd).strip() != '':
            try:
                refund_vnd = Decimal(str(amount_vnd))
            except (InvalidOperation, TypeError, ValueError):
                raise ValueError('Số tiền hoàn không hợp lệ.')
        else:
            refund_vnd = max_refundable

        if not refund_vnd.is_finite() or refund_vnd <= Decimal('0') or refund_vnd > max_refundable:
            raise ValueError(f'Số tiền hoàn phải lớn hơn 0 và không vượt quá {int(max_refundable):,} VNĐ.')

        gateway = _detect_gateway(ov.order, paid_tx)
        shipping = ov.order.shipping_address if isinstance(ov.order.shipping_address, dict) else {}
        refund_bank = shipping.get('refund_bank_info') or {}
        order_code = ov.order.order_code
        grand_total = Decimal(ov.order.grand_total or max_refundable or 1)
        refund_reason = ov.refund_reason or clean_note or 'Hoàn tiền theo yêu cầu'
        paid_tx_id = paid_tx.id if paid_tx else None

    # Execute provider refund call outside DB lock
    if tx_meta.get('external_refunded') and ov.refund_status == 'none':
        refund_ref = str(tx_meta.get('capture_id') or f'WEBHOOK-REFUND-{ov.id}')
        provider_mode = 'paypal_webhook_reconciled'
    elif gateway == 'paypal':
        capture_id = tx_meta.get('capture_id')
        if not capture_id:
            raise ValueError('Không tìm thấy mã capture PayPal để thực hiện hoàn tiền.')
        total_usd_raw = tx_meta.get('amount_usd')
        if total_usd_raw and grand_total > 0 and refund_vnd == grand_total:
            refund_usd = Decimal(str(total_usd_raw)).quantize(Decimal('0.01'))
        elif total_usd_raw and grand_total > 0:
            refund_usd = ((refund_vnd / grand_total) * Decimal(str(total_usd_raw))).quantize(Decimal('0.01'))
        else:
            refund_usd = (refund_vnd / PayPalClient.rate()).quantize(Decimal('0.01'))

        provider_resp = PayPalClient().refund_capture(
            capture_id=capture_id,
            amount_usd=refund_usd,
            note=clean_note or refund_reason,
            request_id=f'sontra-refund-{ov.id}',
        )
        refund_ref = str(provider_resp.get('id') or f'PAYPAL-REFUND-{ov.id}')
        provider_mode = 'paypal_sandbox'
    elif gateway == 'vnpay':
        if not paid_tx:
            raise ValueError('Không tìm thấy giao dịch VNPAY gốc để hoàn tiền.')
        vnpay_resp = vnpay_service.refund_transaction(
            payment=paid_tx,
            amount_vnd=refund_vnd,
            create_by='bql_admin',
            order_info=f'Hoan tien {order_code}',
            request_id=f'VNPAYREF{ov.id}',
        )
        refund_ref = str(vnpay_resp.get('refund_reference') or f'VNPAY-REFUND-{ov.id}')
        provider_mode = vnpay_resp.get('mode', 'vnpay_sandbox')
    else:
        payout_resp = PayOSService.create_payout(
            reference_id=f'REFUND{ov.id}',
            amount=int(refund_vnd),
            description=f'Hoan tien {order_code}',
            to_bin=refund_bank.get('bank_bin', ''),
            to_account_number=refund_bank.get('account_number', ''),
        )
        if payout_resp.get('status') != 'success':
            raise ValueError(payout_resp.get('message') or 'Không thể thực hiện hoàn tiền qua PayOS.')
        refund_ref = str(payout_resp.get('reference_id') or f'PAYOS-REFUND-{ov.id}')
        provider_mode = f"payos_{payout_resp.get('mode', 'mock')}"

    with transaction.atomic():
        ov = OrderVendors.objects.select_for_update().select_related('order').get(pk=ov.id)
        if ov.refund_status == 'refunded':
            return {
                'success': True,
                'id': ov.id,
                'refund_status': 'refunded',
                'refund_status_label': REFUND_STATUS_LABELS['refunded'],
                'refund_reference': refund_ref,
                'message': f'Đơn #{ov.order.order_code} đã được hoàn tiền.',
            }

        previous_status = ov.status
        now = timezone.now()
        ov.status = 'cancelled'
        ov.refund_status = 'refunded'
        ov.refunded_amount = refund_vnd
        ov.refunded_at = now
        if clean_note:
            base_reason = (ov.refund_reason or '').strip()
            ov.refund_reason = f"{base_reason}\n[BQL duyệt]: {clean_note}".strip()
        ov.save(
            update_fields=[
                'status',
                'refund_status',
                'refunded_amount',
                'refunded_at',
                'refund_reason',
                'updated_at',
            ]
        )

        campaign_item_ids = []
        if previous_status != 'cancelled':
            campaign_item_ids = _release_booking_slots(ov)

        restore_unpaid_booking_benefits(ov.order, [ov], campaign_item_ids=campaign_item_ids)

        if not OrderVendors.objects.filter(order=ov.order).exclude(refund_status='refunded').exists():
            ov.order.payment_status = 'refunded'
            ov.order.save(update_fields=['payment_status', 'updated_at'])

        LedgerEntries.objects.filter(order_vendor=ov).exclude(payout_status='paid').update(
            payout_status='on_hold'
        )

        if paid_tx_id:
            locked_tx = PaymentTransactions.objects.select_for_update().filter(pk=paid_tx_id).first()
            if locked_tx:
                meta = dict(locked_tx.raw_response or {})
                meta['refund_reference'] = refund_ref
                meta['refund_provider_mode'] = provider_mode
                meta.pop('needs_review', None)
                locked_tx.raw_response = meta
                locked_tx.save(update_fields=['raw_response', 'updated_at'])

    return {
        'success': True,
        'id': ov.id,
        'refund_status': 'refunded',
        'refund_status_label': REFUND_STATUS_LABELS['refunded'],
        'refunded_amount': int(refund_vnd),
        'refund_reference': refund_ref,
        'provider_mode': provider_mode,
        'message': f'Đã hoàn {int(refund_vnd):,} VNĐ cho đơn #{order_code} ({refund_ref}).'.replace(',', '.'),
    }
