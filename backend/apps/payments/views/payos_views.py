from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import transaction
from decimal import Decimal
import json
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.orders.models import Orders, OrderVendors
from apps.payments.models.payment_models import LedgerEntries
from apps.payments.models import PaymentTransactions
from apps.payments.services.payos_service import PayOSService

logger = logging.getLogger(__name__)


def confirm_order_payment(payos_order_code, transaction_data=None):
    """
    Xác nhận thanh toán thành công cho đơn hàng:
    - Cập nhật Orders: payment_status = 'paid'
    - Cập nhật OrderVendors: status = 'confirmed'
    - Cập nhật PaymentTransactions: status = 'paid'
    - Đảm bảo tính Idempotent (không trừ tiền hay cập nhật 2 lần nếu gọi lặp)
    """
    pt = PaymentTransactions.objects.filter(
        transaction_code=str(payos_order_code),
        payment_gateway='payos'
    ).select_related('order').first()

    if not pt:
        # Dự phòng tìm theo order id nếu order_code là ID
        if str(payos_order_code).isdigit():
            order = Orders.objects.filter(id=int(payos_order_code)).first()
            if order:
                pt = PaymentTransactions.objects.filter(order=order, payment_gateway='payos').first()

    if not pt:
        return None

    order = pt.order
    # Nếu đơn đã được xác nhận thanh toán rồi thì trả về luôn (Idempotency)
    if order.payment_status == 'paid':
        return order

    # Cập nhật đơn
    order.payment_status = 'paid'
    order.save(update_fields=['payment_status', 'updated_at'])

    # Cập nhật các đơn đối tác thuộc order này
    order_vendors = OrderVendors.objects.filter(order=order)
    order_vendors.update(status='confirmed')

    # Chỉ ghi nhận doanh thu và quỹ bảo tồn sau khi PayOS xác nhận đã thanh toán.
    for order_vendor in order_vendors:
        gross_amount = Decimal(order_vendor.subtotal)
        platform_fee = (gross_amount * Decimal('0.05')).quantize(Decimal('1'))
        conservation_fund = (gross_amount * Decimal('0.10')).quantize(Decimal('1'))
        LedgerEntries.objects.get_or_create(
            order_vendor=order_vendor,
            defaults={
                'gross_amount': gross_amount,
                'platform_fee': platform_fee,
                'conservation_fund': conservation_fund,
                'vendor_net_amount': gross_amount - platform_fee - conservation_fund,
                'payout_status': 'recorded',
            }
        )

    # Cập nhật transaction
    pt.status = 'paid'
    if transaction_data:
        pt.raw_response = transaction_data
    pt.save(update_fields=['status', 'raw_response', 'updated_at'])

    return order


def sync_pending_payos_transactions(limit=10):
    """
    Tự động quét và đối soát các giao dịch PayOS đang 'pending' trực tiếp từ máy chủ PayOS.
    Đặc biệt hữu ích cho môi trường localhost hoặc khi Webhook gặp sự cố gián đoạn mạng.
    """
    try:
        from apps.payments.models.payment_models import PaymentTransactions
        from apps.payments.services.payos_service import PayOSService

        pending_txs = PaymentTransactions.objects.filter(
            order__payment_status='pending',
            payment_gateway='payos'
        ).select_related('order')[:limit]

        for tx in pending_txs:
            if tx.transaction_code and str(tx.transaction_code).isdigit():
                payos_res = PayOSService.get_payment_link_information(int(tx.transaction_code))
                if payos_res.get("status") == "success":
                    data = payos_res.get("data", {})
                    if data.get("status") == "PAID":
                        confirm_order_payment(tx.transaction_code, data)
    except Exception as e:
        logger.warning("PayOS sync failed (%s)", type(e).__name__)


@method_decorator(csrf_exempt, name='dispatch')
class PayOSCreatePaymentLinkView(APIView):
    """
    POST /api/v1/payments/payos/create-link/
    Tạo link thanh toán và mã VietQR cho đơn hàng cụ thể
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_code = request.data.get('order_code')
        order_id = request.data.get('order_id')

        order = None
        if order_id:
            order = Orders.objects.filter(id=order_id, customer=request.user).first()
        elif order_code:
            order = Orders.objects.filter(order_code=order_code, customer=request.user).first()

        if not order:
            return Response({
                "status": "error",
                "message": "Không tìm thấy đơn hàng cần thanh toán."
            }, status=status.HTTP_404_NOT_FOUND)

        if order.payment_status == 'paid':
            return Response({
                "status": "error",
                "message": "Đơn hàng này đã được thanh toán trước đó."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Sinh mã số orderCode số nguyên duy nhất cho PayOS
        import time, random
        payos_code = int(f"{order.id}{random.randint(100, 999)}")

        tour_title = "Tour Trekking Sơn Trà"
        # Lấy tên tour từ OrderItems nếu có
        first_item = order.ordervendors_set.first()
        if first_item:
            item_tour = first_item.orderitems_set.filter(tour__isnull=False).first()
            if item_tour and item_tour.tour:
                tour_title = item_tour.tour.title

        res = PayOSService.create_payment_link(
            order_code=payos_code,
            amount=int(order.grand_total),
            description=f"Tour {order.id} #{order.order_code[-4:]}"[:25],
            items=[{"name": tour_title[:50], "quantity": 1, "price": int(order.grand_total)}]
        )

        if res.get("status") == "success":
            data = res.get("data", {})
            # Lưu giao dịch đang chờ vào PaymentTransactions
            PaymentTransactions.objects.update_or_create(
                order=order,
                payment_gateway='payos',
                defaults={
                    'transaction_code': str(payos_code),
                    'amount': order.grand_total,
                    'status': 'pending',
                    'raw_response': data
                }
            )
            return Response({
                "status": "success",
                "data": {
                    "orderCode": payos_code,
                    "order_id": order.id,
                    "booking_code": order.order_code,
                    "amount": int(order.grand_total),
                    "checkoutUrl": data.get("checkoutUrl"),
                    "qrCode": data.get("qrCode"),
                    "accountNumber": data.get("accountNumber"),
                    "accountName": data.get("accountName"),
                    "bin": data.get("bin"),
                    "description": data.get("description")
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "message": res.get("message", "Lỗi khi kết nối với PayOS")
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class PayOSCheckStatusView(APIView):
    """
    GET /api/v1/payments/payos/check-status/<int:order_code>/
    Kiểm tra trạng thái thanh toán (DB + Fallback tra cứu trực tiếp PayOS API).
    Rất quan trọng cho môi trường localhost nơi Webhook không thể bắn về trực tiếp.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_code):
        pt = PaymentTransactions.objects.filter(
            transaction_code=str(order_code),
            payment_gateway='payos',
            order__customer=request.user,
        ).select_related('order').first()

        if not pt:
            return Response({
                "status": "error",
                "message": "Không tìm thấy giao dịch PayOS của tài khoản này."
            }, status=status.HTTP_404_NOT_FOUND)

        # 1. Nếu trong DB đã ghi nhận PAID
        if pt and pt.order and pt.order.payment_status == 'paid':
            return Response({
                "status": "success",
                "payment_status": "PAID",
                "order_code": pt.order.order_code,
                "message": "Đơn hàng đã được thanh toán thành công!"
            }, status=status.HTTP_200_OK)

        # 2. Nếu DB vẫn pending hoặc chưa cập nhật, tra cứu trực tiếp từ máy chủ PayOS
        payos_info = PayOSService.get_payment_link_information(order_code)
        if payos_info.get("status") == "success":
            data = payos_info.get("data", {})
            payos_status = data.get("status")  # 'PAID', 'PENDING', 'CANCELLED', 'EXPIRED'

            if payos_status == "PAID":
                # Kích hoạt đơn hàng ngay lập tức!
                updated_order = confirm_order_payment(order_code, data)
                return Response({
                    "status": "success",
                    "payment_status": "PAID",
                    "order_code": updated_order.order_code if updated_order else str(order_code),
                    "message": "Xác nhận thanh toán thành công từ PayOS!"
                }, status=status.HTTP_200_OK)

            return Response({
                "status": "success",
                "payment_status": payos_status,
                "message": f"Trạng thái giao dịch: {payos_status}"
            }, status=status.HTTP_200_OK)

        # Trả về trạng thái hiện có trong DB
        current_status = pt.status.upper() if pt else "PENDING"
        return Response({
            "status": "success",
            "payment_status": current_status,
            "message": f"Trạng thái đơn: {current_status}"
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PayOSWebhookView(APIView):
    """
    POST /api/v1/payments/payos/webhook/
    Tiếp nhận Webhook từ PayOS khi khách hàng chuyển tiền thành công
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data
        logger.info(f"Received PayOS Webhook: {payload}")

        # Xác thực chữ ký dữ liệu
        is_valid = PayOSService.verify_webhook_data(payload)
        if not is_valid:
            logger.warning("PayOS Webhook: Chữ ký HMAC không hợp lệ!")
            return Response({
                "status": "error",
                "message": "Chữ ký không hợp lệ"
            }, status=status.HTTP_400_BAD_REQUEST)

        data = payload.get("data", {})
        order_code = data.get("orderCode")

        if not order_code:
            return Response({"status": "error", "message": "Thiếu orderCode"}, status=status.HTTP_400_BAD_REQUEST)

        # Xác nhận đơn hàng thành công
        order = confirm_order_payment(order_code, data)
        if order:
            logger.info(f"PayOS Webhook: Đã xác nhận thanh toán thành công cho đơn #{order.order_code} (PayOS: #{order_code})")
            return Response({
                "status": "success",
                "message": f"Đã xác nhận đơn #{order.order_code}"
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"PayOS Webhook: Không tìm thấy đơn hàng cho PayOS #{order_code}")
            return Response({
                "status": "success",
                "message": "Giao dịch đã được ghi nhận"
            }, status=status.HTTP_200_OK)



@method_decorator(csrf_exempt, name='dispatch')
class PayOSCancelPaymentLinkView(APIView):
    """
    POST /api/v1/payments/payos/cancel-link/
    Hủy link thanh toán trên PayOS khi khách bấm Hủy hoặc đóng modal
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_code = request.data.get('order_code')
        reason = request.data.get('reason', 'Khách hủy thanh toán')
        if not order_code:
            return Response({"status": "error", "message": "Thiếu order_code"}, status=status.HTTP_400_BAD_REQUEST)

        transaction_record = PaymentTransactions.objects.filter(
            transaction_code=str(order_code),
            payment_gateway='payos',
            order__customer=request.user,
        ).first()
        if not transaction_record:
            return Response({
                "status": "error",
                "message": "Không tìm thấy giao dịch PayOS của tài khoản này."
            }, status=status.HTTP_404_NOT_FOUND)

        payment_info = PayOSService.get_payment_link_information(order_code)
        if payment_info.get('status') == 'success' and payment_info.get('data', {}).get('status') == 'PAID':
            confirm_payment = confirm_order_payment(order_code, payment_info.get('data'))
            return Response({
                "status": "error",
                "message": "Giao dịch đã thanh toán nên không thể hủy.",
                "order_code": confirm_payment.order_code if confirm_payment else None,
            }, status=status.HTTP_409_CONFLICT)

        res = PayOSService.cancel_payment_link(order_code, reason)

        # Hủy giữ chỗ và hoàn lại số lượng vé nếu đơn vẫn đang chờ thanh toán.
        with transaction.atomic():
            locked_transaction = PaymentTransactions.objects.select_for_update().select_related('order').get(
                id=transaction_record.id
            )
            order = locked_transaction.order
            if order.payment_status == 'pending':
                shipping = order.shipping_address or {}
                schedule_id = shipping.get('schedule_id')
                order_vendors = OrderVendors.objects.select_for_update().filter(order=order)
                total_guests = 0
                campaign_quantities = []
                for order_vendor in order_vendors:
                    for item in order_vendor.orderitems_set.all():
                        total_guests += item.quantity
                        if item.campaign_item_id:
                            campaign_quantities.append((item.campaign_item_id, item.quantity))

                if schedule_id:
                    from apps.tours.models import TourSchedules
                    schedule = TourSchedules.objects.select_for_update().filter(id=schedule_id).first()
                    if schedule:
                        schedule.booked_count = max(0, schedule.booked_count - total_guests)
                        schedule.status = 'almost_full' if 0 < schedule.remaining_slots <= 3 else 'open'
                        schedule.save(update_fields=['booked_count', 'status', 'updated_at'])

                if campaign_quantities:
                    from apps.flash_sales.models import CampaignItems
                    for campaign_item_id, quantity in campaign_quantities:
                        campaign_item = CampaignItems.objects.select_for_update().filter(id=campaign_item_id).first()
                        if campaign_item:
                            campaign_item.sold_quantity = max(0, campaign_item.sold_quantity - quantity)
                            campaign_item.save(update_fields=['sold_quantity'])

                order.payment_status = 'failed'
                order.save(update_fields=['payment_status', 'updated_at'])
                order_vendors.update(status='cancelled', cancellation_reason=reason)

            locked_transaction.status = 'failed'
            locked_transaction.save(update_fields=['status', 'updated_at'])

        return Response({"status": "success", "data": res}, status=status.HTTP_200_OK)
