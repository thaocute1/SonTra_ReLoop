import uuid
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from common.permissions import IsBQL, IsSystemAdmin

from apps.accounts.models.user_models import Users
from apps.vendors.models.vendor_models import Vendors
from apps.orders.models.order_models import Orders, OrderVendors
from ..models.payment_models import (
    PayoutBatches,
    PayoutTransactions,
    LedgerEntries,
    ConservationAllocations
)

BASE_CONSERVATION_GRANT = Decimal('250000000.00')


def _get_conservation_fund_totals():
    # Chỉ tính đóng góp quỹ bảo tồn từ các đơn hàng đã thanh toán thành công và chưa hủy/hoàn tiền.
    total_from_tours = (
        LedgerEntries.objects.filter(
            order_vendor__order__payment_status='paid',
        )
        .exclude(order_vendor__status__in=['cancelled', 'waiting_payment'])
        .exclude(order_vendor__refund_status='refunded')
        .aggregate(total=Sum('conservation_fund'))['total']
        or Decimal('0.00')
    )
    total_fund_accumulated = BASE_CONSERVATION_GRANT + Decimal(str(total_from_tours))
    total_disbursed = (
        ConservationAllocations.objects.aggregate(total=Sum('allocated_amount'))['total']
        or Decimal('0.00')
    )
    total_disbursed = Decimal(str(total_disbursed))
    remaining_fund = total_fund_accumulated - total_disbursed
    return total_fund_accumulated, total_disbursed, remaining_fund


class ConservationFundAdminView(APIView):
    """
    GET /api/v1/payments/conservation-funds/
    AD-04: Quản lý Quỹ bảo tồn - Thống kê tổng nguồn quỹ và danh mục phân bổ
    """
    permission_classes = [IsAuthenticated, IsBQL]

    def get(self, request):
        total_fund_accumulated, total_disbursed, remaining_fund = _get_conservation_fund_totals()
        allocations_qs = ConservationAllocations.objects.all().order_by('-disbursed_at', '-id')

        allocations_data = []
        for alloc in allocations_qs:
            allocations_data.append({
                'id': alloc.id,
                'project_name': alloc.project_name,
                'category': alloc.category,
                'category_label': {
                    'reforestation': 'Trồng Rừng & Cây Bản Địa',
                    'wildlife_protection': 'Cứu Hộ Động Vật Hoang Dã (Voọc)',
                    'clean_up': 'Thu Gom Rác & Làm Sạch Bãi Biển',
                    'patrol_equipment': 'Trang Thiết Bị Tuần Tra Rừng',
                }.get(alloc.category, 'Bảo Tồn Sinh Thái'),
                'allocated_amount': int(alloc.allocated_amount),
                'allocated_amount_formatted': f"{int(alloc.allocated_amount):,} VNĐ".replace(',', '.'),
                'disbursed_at': alloc.disbursed_at.strftime('%d/%m/%Y'),
                'beneficiary_name': alloc.beneficiary_name or 'Đội Tuần Tra & Cứu Hộ BQL',
                'notes': alloc.notes or '',
                'evidence_url': alloc.evidence_url or ''
            })

        return Response({
            'total_fund_accumulated': int(total_fund_accumulated),
            'total_fund_accumulated_formatted': f"{int(total_fund_accumulated):,} VNĐ".replace(',', '.'),
            'total_disbursed': int(total_disbursed),
            'total_disbursed_formatted': f"{int(total_disbursed):,} VNĐ".replace(',', '.'),
            'remaining_fund': int(remaining_fund),
            'remaining_fund_formatted': f"{int(remaining_fund):,} VNĐ".replace(',', '.'),
            'allocations_count': len(allocations_data),
            'allocations': allocations_data
        }, status=status.HTTP_200_OK)


class ConservationFundAllocateView(APIView):
    """
    POST /api/v1/payments/conservation-funds/allocate/
    AD-04: Tạo quyết định giải ngân phân bổ Quỹ Bảo Tồn
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request):
        data = request.data
        project_name = (data.get('project_name') or '').strip()
        category = data.get('category', 'reforestation')
        raw_amount = data.get('amount') if data.get('amount') is not None else data.get('allocated_amount')
        notes = data.get('notes') or data.get('description', '')
        beneficiary_name = data.get('beneficiary_name', 'Ban Quản Lý Bán Đảo Sơn Trà')

        if not project_name or raw_amount is None or str(raw_amount).strip() == '':
            return Response({'error': 'Vui lòng cung cấp tên dự án và số tiền giải ngân!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            allocated_amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Số tiền giải ngân không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)

        if not allocated_amount.is_finite() or allocated_amount <= Decimal('0'):
            return Response({'error': 'Số tiền giải ngân phải lớn hơn 0!'}, status=status.HTTP_400_BAD_REQUEST)

        admin_user = request.user

        with transaction.atomic():
            _, _, remaining_fund = _get_conservation_fund_totals()
            if allocated_amount > remaining_fund:
                return Response(
                    {'error': f'Số tiền giải ngân vượt quá số dư quỹ hiện có ({int(remaining_fund):,} VNĐ)!'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allocation = ConservationAllocations.objects.create(
                project_name=project_name,
                category=category,
                allocated_amount=allocated_amount,
                disbursed_at=timezone.now(),
                approved_by_admin=admin_user,
                beneficiary_name=beneficiary_name,
                notes=notes
            )

        return Response({
            'success': True,
            'status': 'success',
            'message': f'Đã giải ngân thành công {int(allocation.allocated_amount):,} VNĐ cho dự án "{allocation.project_name}"!',
            'allocation_id': allocation.id
        }, status=status.HTTP_201_CREATED)


class PayoutAdminListView(APIView):
    """
    GET /api/v1/payments/payouts/
    AD-05: Danh sách đối soát doanh thu Vendor & Các đợt Payout giải ngân
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        from ..services.admin_payout_service import payout_overview
        return Response(payout_overview())


class PayoutExecuteView(APIView):
    """
    POST /api/v1/payments/payouts/execute/
    AD-05: Khởi tạo lệnh chia doanh thu (Split-Payment Payout) cho Vendor
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request):
        from ..services.admin_payout_service import simulate_payout_batch
        return Response(simulate_payout_batch(), status=status.HTTP_200_OK)

class RevenueReportAdminView(APIView):
    """
    GET /api/v1/payments/reports/revenue/
    AD-06: Báo cáo & Thống kê doanh thu, số lượt đặt tour theo mốc thời gian
    """
    permission_classes = [IsAuthenticated, IsBQL]

    def get(self, request):
        from ..services.admin_report_service import revenue_report
        return Response(revenue_report(
            request.query_params.get('period', 'month'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date'),
        ))


class RefundAdminListView(APIView):
    """
    GET /api/v1/payments/refunds/
    Danh sách yêu cầu hoàn tiền & giao dịch cần đối soát hoàn tiền cho BQL
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        from ..services.refund_service import list_admin_refunds
        return Response(list_admin_refunds(), status=status.HTTP_200_OK)


class RefundProcessAdminView(APIView):
    """
    POST /api/v1/payments/refunds/<int:order_vendor_id>/process/
    BQL duyệt hoặc từ chối yêu cầu hoàn tiền (gọi PayPal Sandbox / PayOS Chi hộ)
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request, order_vendor_id):
        from ..services.refund_service import process_admin_refund
        from ..services.paypal_client import PayPalError
        from ..services.vnpay_service import VNPayError

        decision = (request.data.get('decision') or '').strip().lower()
        admin_note = request.data.get('admin_note') or ''
        amount_vnd = request.data.get('amount')

        try:
            result = process_admin_refund(
                order_vendor_id=order_vendor_id,
                decision=decision,
                admin_note=admin_note,
                amount_vnd=amount_vnd,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (PayPalError, VNPayError) as exc:
            return Response({'error': str(exc.detail)}, status=status.HTTP_502_BAD_GATEWAY)
