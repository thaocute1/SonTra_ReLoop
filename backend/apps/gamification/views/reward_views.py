from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

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

