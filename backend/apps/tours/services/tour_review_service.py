from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from apps.accounts.models.notification_models import Notifications
from apps.vendors.models import Vendors
from ..models import Tours
from .tour_service import TourService


class TourReviewConflict(APIException):
    status_code = 409
    default_detail = 'Tour này không còn chờ duyệt. Vui lòng tải lại danh sách.'


class TourReviewService:
    @staticmethod
    def queryset():
        return Tours.objects.filter(deleted_at__isnull=True, vendor__deleted_at__isnull=True).select_related(
            'vendor', 'approved_by_admin',
        )

    @classmethod
    def queue(cls, status='pending_approval', search=''):
        base = cls.queryset()
        metrics = base.aggregate(
            pending_approval=Count('id', filter=Q(status='pending_approval')),
            published=Count('id', filter=Q(status='published')),
            rejected=Count('id', filter=Q(status='rejected')),
            all=Count('id'),
        )
        if status != 'all':
            base = base.filter(status=status)
        if search:
            base = base.filter(Q(title__icontains=search) | Q(vendor__brand_name__icontains=search))
        return base.order_by('-created_at', '-id'), metrics

    @classmethod
    def detail(cls, tour_id):
        tour = cls.queryset().filter(pk=tour_id).first()
        if not tour:
            raise NotFound('Không tìm thấy tour cần duyệt.')
        # Reuse the vendor/customer route, checkpoint and departure formatting.
        data = TourService._format_tour_from_db(tour)
        data.update({
            'vendor_status': tour.vendor.status,
            'created_at': tour.created_at,
            'approved_at': tour.approved_at,
            'approved_by_name': tour.approved_by_admin.name if tour.approved_by_admin_id else None,
            'rejection_reason': tour.rejection_reason or '',
        })
        return data

    @classmethod
    def review(cls, tour_id, actor, action, reason=''):
        if getattr(actor, 'role', '') not in ('system_admin', 'staff'):
            raise PermissionDenied('Chỉ BQL được duyệt và xuất bản tour.')
        if action not in ('approve', 'reject'):
            raise ValidationError('Thao tác duyệt tour không hợp lệ.')
        reason = (reason or '').strip()
        if action == 'reject' and not reason:
            raise ValidationError('Vui lòng nhập lý do từ chối tour.')
        vendor_id = cls.queryset().filter(pk=tour_id).values_list('vendor_id', flat=True).first()
        if not vendor_id:
            raise NotFound('Không tìm thấy tour cần duyệt.')

        with transaction.atomic():
            # Lock vendor before tour; registration also locks the vendor first.
            vendor = Vendors.objects.select_for_update(of=('self',)).select_related('user').filter(
                pk=vendor_id, deleted_at__isnull=True,
            ).first()
            if not vendor:
                raise NotFound('Không tìm thấy đơn vị sở hữu tour.')
            tour = Tours.objects.select_for_update().filter(pk=tour_id, vendor=vendor, deleted_at__isnull=True).first()
            if not tour:
                raise NotFound('Không tìm thấy tour cần duyệt.')
            if tour.status != 'pending_approval':
                raise TourReviewConflict()
            if action == 'approve' and (
                vendor.status != 'approved' or vendor.user.status != 'active' or vendor.user.deleted_at is not None
            ):
                raise ValidationError('Chỉ xuất bản tour của đối tác đã được duyệt và có tài khoản đang hoạt động.')

            tour.status = 'published' if action == 'approve' else 'rejected'
            tour.approved_by_admin = actor if action == 'approve' else None
            tour.approved_at = timezone.now() if action == 'approve' else None
            tour.rejection_reason = '' if action == 'approve' else reason
            tour.save(update_fields=['status', 'approved_by_admin', 'approved_at', 'rejection_reason', 'updated_at'])
            Notifications.objects.create(
                user=vendor.user, notification_type='system',
                title='Tour đã được phê duyệt và xuất bản' if action == 'approve' else 'Tour chưa được phê duyệt',
                body=(f'Tour "{tour.title}" đã được BQL phê duyệt. Bạn có thể đăng ký tour vào phiên Flash Sale phù hợp.'
                      if action == 'approve' else f'Tour "{tour.title}" bị từ chối. Lý do: {reason}'),
            )
        return cls.detail(tour_id)
