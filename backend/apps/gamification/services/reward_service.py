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
            effective_from__lte=now,
            effective_to__gte=now,
            approval_status='approved'
        ).select_related('vendor').order_by('-points_required')

    @staticmethod
    def redeem_reward(user_obj, voucher_id):
        """
        Executes real-time points deduction and reward acquisition within an atomic database transaction.
        Uses select_for_update to lock user row and prevent race conditions or double-spending.
        PostgreSQL trigger private.sync_eco_points() automatically synchronizes user total_eco_points.
        """
        if not voucher_id:
            raise ValidationError({'voucher_id': 'Vui lòng cung cấp mã phần thưởng cần đổi.'})

        try:
            voucher = Vouchers.objects.select_for_update().get(
                id=voucher_id,
                is_active=True,
                deleted_at__isnull=True,
                approval_status='approved'
            )
        except Vouchers.DoesNotExist:
            raise NotFound({'error': 'Phần thưởng không tồn tại hoặc đã hết hạn áp dụng.'})

        now = timezone.now()
        if voucher.effective_from and voucher.effective_from > now:
            raise ValidationError({'error': 'Phần thưởng chưa bắt đầu áp dụng.'})
        if voucher.effective_to and voucher.effective_to < now:
            raise ValidationError({'error': 'Phần thưởng này đã hết hạn chương trình.'})

        with transaction.atomic():
            # Lock the user record for update to guarantee concurrency safety
            user = Users.objects.select_for_update().get(id=user_obj.id)

            if voucher.quantity_total is not None and voucher.quantity_redeemed >= voucher.quantity_total:
                raise ValidationError({'error': 'Phần thưởng này đã hết lượt đổi.'})
            used_count = UserVouchers.objects.filter(user=user, voucher=voucher).count()
            if voucher.per_user_limit is not None and used_count >= voucher.per_user_limit:
                raise ValidationError({'error': 'Bạn đã đạt giới hạn đổi phần thưởng này.'})
            if user.total_eco_points < voucher.points_required:
                diff = voucher.points_required - user.total_eco_points
                raise ValidationError({
                    'error': f'Số dư điểm không đủ! Bạn còn thiếu {diff} RE-Points nữa để đổi phần thưởng này.'
                })

            # 1. Issue a unique user voucher
            user_voucher = UserVouchers.objects.create(
                user=user,
                voucher=voucher,
                status='unused'
            )
            Vouchers.objects.filter(pk=voucher.pk).update(quantity_redeemed=(voucher.quantity_redeemed or 0) + 1)

            # 2. Write immutable record into Points Ledger (Single Source of Truth)
            # Vendor=None triggers the DB function private.sync_eco_points() to deduct points
            points_ledger = PointsLedger.objects.create(
                user=user,
                vendor=None,
                points_change=-voucher.points_required,
                reason=f"Đổi phần thưởng: {voucher.title}",
                reference_type="voucher_redemption",
                user_voucher=user_voucher
            )

            # 3. Refresh user record from database to read updated balance from trigger
            user.refresh_from_db()

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
