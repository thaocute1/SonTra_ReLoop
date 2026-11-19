from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from apps.orders.models import Orders, OrderVendors, OrderItems
from apps.payments.models import PaymentTransactions, LedgerEntries


def confirm_transaction_payment(payment, provider_data=None, protect_lifecycle=False):
    """Fulfill PayPal captures without changing the existing PayOS entry point."""
    with transaction.atomic():
        order = Orders.objects.select_for_update().get(pk=payment.order_id)
        payment = PaymentTransactions.objects.select_for_update().get(pk=payment.pk)
        if payment.status == 'paid':
            return order
        if not protect_lifecycle and order.payment_status == 'paid':
            return order
        vendors = list(OrderVendors.objects.select_for_update().filter(order=order).order_by('id'))
        late_reason = None
        if protect_lifecycle:
            if order.payment_status == 'paid':
                late_reason = 'Đơn đã được thanh toán bằng giao dịch khác; cần đối soát khoản thu trùng.'
            elif order.payment_status != 'pending' or any(row.status != 'waiting_payment' for row in vendors):
                late_reason = 'Đặt chỗ không còn chờ thanh toán; cần kiểm tra và hoàn tiền nếu cần.'
            elif order.expires_at and order.expires_at <= timezone.now():
                late_reason = 'Khoản thanh toán đến sau hạn giữ chỗ; cần kiểm tra trước khi xác nhận chuyến đi.'
        if payment.payment_gateway == 'paypal':
            metadata = {**(payment.raw_response or {}), 'confirmation': provider_data or {}}
            if late_reason:
                metadata['needs_review'] = late_reason
            payment.raw_response = metadata
        elif provider_data:
            payment.raw_response = provider_data
        payment.status = 'paid'
        payment.save(update_fields=['status', 'raw_response', 'updated_at'])
        order.payment_status = 'paid'
        order.save(update_fields=['payment_status', 'updated_at'])
        if late_reason:
            return order

        OrderVendors.objects.filter(order=order).update(status='confirmed')
        from apps.challenging.models.challenge_models import Challenges, ChallengeAttempts
        from apps.accounts.models.notification_models import Notifications
        for vendor_order in vendors:
            tour_ids = OrderItems.objects.filter(order_vendor=vendor_order, tour__isnull=False).values_list('tour_id', flat=True).distinct()
            now = timezone.now()
            missions = Challenges.objects.filter(
                tour_id__in=tour_ids, scope='tour', is_required=True, is_active=True,
                approval_status='approved', deleted_at__isnull=True,
            ).filter(Q(valid_from__isnull=True) | Q(valid_from__lte=now)).filter(Q(valid_to__isnull=True) | Q(valid_to__gte=now))
            for mission in missions:
                attempt, created = ChallengeAttempts.objects.get_or_create(
                    challenge=mission, customer=order.customer, order_vendor=vendor_order, assignment_source='auto_booking',
                    defaults={'status': 'in_progress', 'started_at': None},
                )
                if created:
                    Notifications.objects.create(
                        user=order.customer, notification_type='mission_assigned', title='Bạn có nhiệm vụ xanh mới',
                        body=f'Nhiệm vụ bắt buộc "{mission.title}" đã được thêm vào chuyến đi của bạn.',
                        challenge=mission, challenge_attempt=attempt,
                    )
            gross = Decimal(vendor_order.subtotal)
            fee = (gross * Decimal('0.05')).quantize(Decimal('1'))
            fund = (gross * Decimal('0.10')).quantize(Decimal('1'))
            LedgerEntries.objects.get_or_create(order_vendor=vendor_order, defaults={
                'gross_amount': gross, 'platform_fee': fee, 'conservation_fund': fund,
                'vendor_net_amount': gross - fee - fund, 'payout_status': 'recorded',
            })
        return order
