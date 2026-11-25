from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from common.permissions import IsBQL
from django.db.models import Sum
from django.utils import timezone

from apps.accounts.models.user_models import Users
from apps.challenging.models.challenge_models import Challenges, ChallengeAttempts, CheckinLogs
from ..models.gamification_models import EcoTrashSubmissions
from ..services.reward_service import RewardService
from ..serializers.reward_serializers import (
    VoucherRewardSerializer,
    RedeemRewardRequestSerializer,
    UserVoucherSerializer,
    PointsLedgerSerializer
)

class RewardListView(APIView):
    """
    Public API: Lists all active tour vouchers and on-site eco-gifts available for redemption.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        rewards = RewardService.get_active_rewards()
        serializer = VoucherRewardSerializer(rewards, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class RedeemRewardView(APIView):
    """
    Protected API: Atomically deducts user RE-Points and issues a unique voucher or gift card.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RedeemRewardRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        voucher_id = serializer.validated_data['voucher_id']

        result = RewardService.redeem_reward(
            user_obj=request.user,
            voucher_id=voucher_id
        )

        return Response({
            'success': True,
            'message': result['message'],
            'new_total_points': result['new_total_points'],
            'user_voucher': UserVoucherSerializer(result['user_voucher']).data
        }, status=status.HTTP_200_OK)


class MyVouchersView(APIView):
    """
    Protected API: Returns the current user's wallet of redeemed vouchers and gift cards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vouchers = RewardService.get_my_vouchers(request.user)
        serializer = UserVoucherSerializer(vouchers, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class PointsLedgerView(APIView):
    """
    Protected API: Returns the current user's transparent points transaction ledger timeline.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ledger_records = RewardService.get_user_ledger(request.user)
        serializer = PointsLedgerSerializer(ledger_records, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class UserEcoStatsView(APIView):
    """
    Protected API: Returns dynamic user eco statistics directly from database.
    Single Source of Truth for Points, Kilometers, Trash kg and Eco Rank.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        points = user.total_eco_points or 0

        # Trash weight (only approved submissions count toward verified eco stats)
        trash_agg = EcoTrashSubmissions.objects.filter(customer=user, status='approved').aggregate(total=Sum('total_weight_kg'))
        total_trash_kg = float(trash_agg['total']) if trash_agg['total'] is not None else 0.0

        # Total distance
        km_agg = ChallengeAttempts.objects.filter(
            customer=user,
            status='completed',
        ).aggregate(total_km=Sum('challenge__tour__routes__total_distance_km'))
        total_km = float(km_agg['total_km']) if km_agg['total_km'] is not None else 0.0

        # Ranking calculation
        higher_count = Users.objects.filter(
            status='active',
            total_eco_points__gt=points
        ).count()
        rank_number = higher_count + 1

        if rank_number == 1:
            rank_label = "#1 Eco-Guardian"
        elif rank_number <= 3:
            rank_label = f"#{rank_number} Eco-Hero"
        elif rank_number <= 10:
            rank_label = f"#{rank_number} Eco-Warrior"
        else:
            rank_label = f"#{rank_number} Hộ Vệ Sơn Trà"

        total_missions = Challenges.objects.filter(is_active=True, deleted_at__isnull=True).count()
        completed_missions = ChallengeAttempts.objects.filter(customer=user, status='completed').count()

        return Response({
            'points': points,
            'total_km': round(total_km, 1),
            'total_trash_kg': round(total_trash_kg, 1),
            'rank': rank_label,
            'rank_number': rank_number,
            'completed_missions_count': completed_missions,
            'total_missions_count': total_missions,
        }, status=status.HTTP_200_OK)


class ESGMetricsAdminView(APIView):
    """
    GET /api/v1/gamification/admin/esg-metrics/
    AD-07: ESG Dashboard - Chỉ số tác động sinh thái tổng hợp toàn bán đảo Sơn Trà từ DB
    """
    permission_classes = [IsAuthenticated, IsBQL]

    def get(self, request):
        from apps.gamification.models.gamification_models import Feedbacks
        from apps.vendors.models.vendor_models import Vendors
        from apps.payments.views.admin_payment_views import _get_conservation_fund_totals

        # 1. Total approved trash collected
        trash_agg = EcoTrashSubmissions.objects.filter(status='approved').aggregate(total=Sum('total_weight_kg'))
        total_trash_kg = float(trash_agg['total'] or 0)

        # 2. Total green points in circulation
        points_agg = Users.objects.filter(deleted_at__isnull=True).aggregate(total=Sum('total_eco_points'))
        total_points_in_system = int(points_agg['total'] or 0)

        # 3. Check-in logs & completed route distance
        checkins_count = CheckinLogs.objects.count()
        km_agg = ChallengeAttempts.objects.filter(status='completed').aggregate(
            total_km=Sum('challenge__tour__routes__total_distance_km')
        )
        total_green_distance_km = round(float(km_agg['total_km'] or 0), 1)

        # 4. Incidents resolved, conservation fund, active staff, approved vendors
        total_incidents_resolved = Feedbacks.objects.filter(
            feedback_type__in=['environmental_issue', 'safety_violation'],
            status='resolved',
        ).count()

        total_fund_accumulated, _, _ = _get_conservation_fund_totals()
        total_conservation_fund_int = int(total_fund_accumulated or 0)
        total_conservation_fund_formatted = f"{total_conservation_fund_int:,} VNĐ".replace(',', '.')

        total_active_staffs = Users.objects.filter(
            role='staff', status='active', deleted_at__isnull=True
        ).count()
        certified_vendors_count = Vendors.objects.filter(
            status='approved', deleted_at__isnull=True
        ).count()

        metrics_data = {
            'total_trash_kg': round(total_trash_kg, 1),
            'total_trash_collected_kg': round(total_trash_kg, 1),
            'total_green_distance_km': total_green_distance_km,
            'total_checkins': checkins_count,
            'total_incidents_resolved': total_incidents_resolved,
            'total_points_in_system': total_points_in_system,
            'total_conservation_fund': total_conservation_fund_int,
            'total_conservation_fund_formatted': total_conservation_fund_formatted,
            'total_active_staffs': total_active_staffs,
            'certified_vendors_count': certified_vendors_count,
            'esg_fund_contribution_rate': 10,
            'last_updated': timezone.now().strftime('%d/%m/%Y %H:%M')
        }

        return Response({
            'status': 'success',
            'data': metrics_data,
            **metrics_data
        }, status=status.HTTP_200_OK)


CONSERVATION_DONATION_PROJECTS = [
    {
        'code': 'DONATE-TREE-100',
        'title': 'Góp 1 Cây Bản Địa Phục Hồi Rừng Sơn Trà',
        'points_required': 100,
        'impact_label': '1 cây sao đen / lim xanh bản địa',
        'description': 'Đóng góp 100 RE-Points vào chiến dịch trồng dặm cây rừng bản địa tại khu vực sườn đông bán đảo Sơn Trà.',
    },
    {
        'code': 'DONATE-CLEAN-150',
        'title': 'Tài Trợ Túi Lưới Dọn Rác Rạn San Hô Bãi Nam',
        'points_required': 150,
        'impact_label': '1 bộ dụng cụ lặn thu gom lưới ma',
        'description': 'Hỗ trợ đội tình nguyện viên lặn biển thu gom rác nhựa và lưới đánh cá mắc vào rạn san hô Bãi Nam.',
    },
    {
        'code': 'DONATE-VOOC-200',
        'title': 'Bảo Vệ Sinh Cảnh Voọc Chà Vá Chân Nâu',
        'points_required': 200,
        'impact_label': 'Hỗ trợ tuần tra & giám sát sinh cảnh Voọc',
        'description': 'Đóng góp trực tiếp cho hoạt động tuần tra bảo vệ đàn Voọc chà vá chân nâu quý hiếm tại bán đảo Sơn Trà.',
    },
]


class ConservationDonateView(APIView):
    """
    GET / POST /api/v1/gamification/rewards/donate/
    KH-06: Du khách quyên góp RE-Points cho các dự án bảo tồn thiên nhiên Sơn Trà.
    Lưu lịch sử bất biến vào PointsLedger và cấp chứng nhận vào UserVouchers.
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        from apps.gamification.models.gamification_models import PointsLedger
        user_donated_pts = 0
        user_donations_count = 0
        if getattr(request.user, 'is_authenticated', False):
            qs = PointsLedger.objects.filter(
                user=request.user,
                reference_type='conservation_donation',
            )
            user_donations_count = qs.count()
            agg = qs.aggregate(total=Sum('points_change'))['total'] or 0
            user_donated_pts = abs(int(agg))

        return Response({
            'status': 'success',
            'projects': CONSERVATION_DONATION_PROJECTS,
            'user_donated_points': user_donated_pts,
            'user_donations_count': user_donations_count,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        from datetime import timedelta
        from django.db import transaction
        from apps.orders.models.order_models import Vouchers, UserVouchers
        from apps.gamification.models.gamification_models import PointsLedger

        project_code = str(request.data.get('project_code') or '').strip()
        project = next((p for p in CONSERVATION_DONATION_PROJECTS if p['code'] == project_code), None)
        if not project:
            return Response(
                {'error': 'Dự án quyên góp bảo tồn không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_pts = int(project['points_required'])
        now = timezone.now()

        with transaction.atomic():
            user = Users.objects.select_for_update().get(id=request.user.id)
            current_pts = int(user.total_eco_points or 0)
            if current_pts < required_pts:
                diff = required_pts - current_pts
                return Response(
                    {'error': f'Số dư điểm không đủ! Bạn còn thiếu {diff} RE-Points để quyên góp cho dự án này.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            voucher, _ = Vouchers.objects.get_or_create(
                code=project['code'],
                defaults={
                    'title': project['title'],
                    'points_required': required_pts,
                    'reward_type': 'donation',
                    'description': project['description'],
                    'effective_from': now - timedelta(days=1),
                    'effective_to': now + timedelta(days=3650),
                    'is_active': True,
                    'approval_status': 'approved',
                    'per_user_limit': 9999,
                },
            )

            user_voucher = UserVouchers.objects.create(
                user=user,
                voucher=voucher,
                status='used',
                used_at=now,
            )

            ledger_entry = PointsLedger.objects.create(
                user=user,
                vendor=None,
                points_change=-required_pts,
                reason=f"Quyên góp bảo tồn: {project['title']}",
                reference_type='conservation_donation',
                user_voucher=user_voucher,
            )

            user.refresh_from_db()

        return Response({
            'success': True,
            'status': 'success',
            'message': f'Cảm ơn bạn đã quyên góp {required_pts} RE-Points cho dự án "{project["title"]}"!',
            'new_total_points': int(user.total_eco_points or 0),
            'certificate_code': f"CERT-ESG-{user_voucher.id}",
            'ledger_id': ledger_entry.id,
        }, status=status.HTTP_201_CREATED)
