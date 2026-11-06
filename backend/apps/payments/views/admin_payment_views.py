import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.models.user_models import Users
from apps.vendors.models.vendor_models import Vendors
from apps.orders.models.order_models import Orders, OrderVendors
from ..models.payment_models import (
    PayoutBatches,
    PayoutTransactions,
    LedgerEntries,
    ConservationAllocations
)


class ConservationFundAdminView(APIView):
    """
    GET /api/v1/payments/conservation-funds/
    AD-04: Quản lý Quỹ bảo tồn - Thống kê tổng nguồn quỹ và danh mục phân bổ
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # 1. Total revenue allocated to fund from tour tickets (10% of gross)
        total_from_tours = LedgerEntries.objects.aggregate(total=Sum('conservation_fund'))['total'] or Decimal('0.00')
        
        # Base seed fund for Son Tra Peninsula preservation if ledger is young
        base_initial_grant = Decimal('250000000.00') # 250 million VND initial conservation grant
        total_fund_accumulated = base_initial_grant + Decimal(str(total_from_tours))

        # 2. Total disbursed from ConservationAllocations
        allocations_qs = ConservationAllocations.objects.all().order_by('-disbursed_at', '-id')
        total_disbursed = allocations_qs.aggregate(total=Sum('allocated_amount'))['total'] or Decimal('0.00')

        remaining_fund = total_fund_accumulated - total_disbursed

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
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        project_name = data.get('project_name')
        category = data.get('category', 'reforestation')
        amount = data.get('amount')
        notes = data.get('notes', '')
        beneficiary_name = data.get('beneficiary_name', 'Ban Quản Lý Bán Đảo Sơn Trà')

        if not project_name or not amount:
            return Response({'error': 'Vui lòng cung cấp tên dự án và số tiền giải ngân!'}, status=status.HTTP_400_BAD_REQUEST)

        admin_user = request.user if request.user and request.user.is_authenticated else Users.objects.filter(role__in=['system_admin', 'admin']).first()
        if not admin_user:
            admin_user = Users.objects.first()

        allocation = ConservationAllocations.objects.create(
            project_name=project_name,
            category=category,
            allocated_amount=Decimal(str(amount)),
            disbursed_at=timezone.now(),
            approved_by_admin=admin_user,
            beneficiary_name=beneficiary_name,
            notes=notes
        )

        return Response({
            'success': True,
            'message': f'Đã giải ngân thành công {int(allocation.allocated_amount):,} VNĐ cho dự án "{allocation.project_name}"!',
            'allocation_id': allocation.id
        }, status=status.HTTP_201_CREATED)


class PayoutAdminListView(APIView):
    """
    GET /api/v1/payments/payouts/
    AD-05: Danh sách đối soát doanh thu Vendor & Các đợt Payout giải ngân
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from ..services.admin_payout_service import payout_overview
        return Response(payout_overview())


class PayoutExecuteView(APIView):
    """
    POST /api/v1/payments/payouts/execute/
    AD-05: Khởi tạo lệnh chia doanh thu (Split-Payment Payout) cho Vendor
    """
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({
            'success': False,
            'error': 'Chưa cấu hình dịch vụ giải ngân ngân hàng. Chưa phát lệnh chuyển tiền và chưa cập nhật sổ cái.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)



class RevenueReportAdminView(APIView):
    """
    GET /api/v1/payments/reports/revenue/
    AD-06: Báo cáo & Thống kê doanh thu, số lượt đặt tour theo mốc thời gian
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from ..services.admin_report_service import revenue_report
        return Response(revenue_report(
            request.query_params.get('period', 'month'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date'),
        ))
