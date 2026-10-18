import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound

from apps.accounts.models.user_models import Users
from apps.orders.models.order_models import Vouchers, UserVouchers
from apps.gamification.models.gamification_models import PointsLedger

class RewardService:

    @staticmethod
    def get_active_rewards():
        """Returns all currently active vouchers and eco-gifts available for redemption."""
        now = timezone.now()
        return Vouchers.objects.filter(
            is_active=True,
            deleted_at__isnull=True,
            effective_to__gte=now
        ).select_related('vendor').order_by('-points_required')

    @staticmethod
    def redeem_reward(user_obj, voucher_id):
        """
        Executes real-time points deduction and reward acquisition within an atomic database transaction.
        Uses select_for_update to lock user row and prevent race conditions or double-spending.
        """
        if not voucher_id:
            raise ValidationError({'voucher_id': 'Vui lòng cung cấp mã phần thưởng cần đổi.'})

        try:
            voucher = Vouchers.objects.get(
                id=voucher_id,
                is_active=True,
                deleted_at__isnull=True
            )
        except Vouchers.DoesNotExist:
            raise NotFound({'error': 'Phần thưởng không tồn tại hoặc đã hết hạn áp dụng.'})

        now = timezone.now()
        if voucher.effective_to and voucher.effective_to < now:
            raise ValidationError({'error': 'Phần thưởng này đã hết hạn chương trình.'})

        with transaction.atomic():
            # Lock the user record for update to guarantee concurrency safety
            user = Users.objects.select_for_update().get(id=user_obj.id)

            if user.total_eco_points < voucher.points_required:
                diff = voucher.points_required - user.total_eco_points
                raise ValidationError({
                    'error': f'Số dư điểm không đủ! Bạn còn thiếu {diff} RE-Points nữa để đổi phần thưởng này.'
                })

            # 1. Deduct points from user balance
            user.total_eco_points -= voucher.points_required
            user.save(update_fields=['total_eco_points', 'updated_at'])

            # 2. Issue a unique user voucher
            user_voucher = UserVouchers.objects.create(
                user=user,
                voucher=voucher,
                status='unused'
            )

            # 3. Write immutable record into Points Ledger (Single Source of Truth)
            points_ledger = PointsLedger.objects.create(
                user=user,
                vendor=voucher.vendor,
                points_change=-voucher.points_required,
                reason=f"Đổi phần thưởng: {voucher.title}",
                reference_type="voucher_redemption",
                user_voucher=user_voucher
            )

            return {
                'success': True,
                'message': f'Đổi thành công "{voucher.title}"!',
                'user_voucher': user_voucher,
                'new_total_points': user.total_eco_points,
                'ledger_id': points_ledger.id
            }

    @staticmethod
    def get_my_vouchers(user_obj):
        """Retrieves all vouchers and gift redemption cards owned by the user."""
        return UserVouchers.objects.filter(
            user=user_obj
        ).select_related('voucher', 'voucher__vendor').order_by('-acquired_at')

    @staticmethod
    def get_user_ledger(user_obj):
        """Retrieves points activity timeline for the user."""
        return PointsLedger.objects.filter(
            user=user_obj
        ).order_by('-created_at')

