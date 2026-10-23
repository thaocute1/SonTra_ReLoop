from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Sum

from apps.accounts.models.user_models import Users
from apps.challenging.models.challenge_models import Challenges, ChallengeAttempts
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

        # Trash weight
        trash_agg = EcoTrashSubmissions.objects.filter(customer=user).aggregate(total=Sum('total_weight_kg'))
        total_trash_kg = float(trash_agg['total']) if trash_agg['total'] is not None else 0.0

        # Total distance
        total_km = 0.0
        attempts = ChallengeAttempts.objects.filter(customer=user, status='completed').select_related('challenge__tour')
        for att in attempts:
            if att.challenge and att.challenge.tour:
                try:
                    route = att.challenge.tour.routes.first()
                    if route and route.total_distance_km:
                        total_km += float(route.total_distance_km)
                except Exception:
                    pass

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
