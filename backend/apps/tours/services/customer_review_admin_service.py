from decimal import Decimal
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.accounts.models.notification_models import Notifications
from apps.gamification.models.gamification_models import PointsLedger, Reviews
from apps.vendors.models import Vendors
from ..models import Tours
from .review_helpers import build_review_images_payload, parse_review_payload
from .tour_service import TourService

STATUS_LABELS = {
    'approved': 'Đang hiển thị',
    'pending_approval': 'Chờ kiểm duyệt',
    'rejected': 'Đã ẩn / Từ chối',
}


class CustomerReviewAdminService:
    """Nghiệp vụ kiểm duyệt đánh giá khách hàng và giám sát chất lượng cho BQL / Admin."""

    @staticmethod
    def _quality_level(avg_rating, total_reviews):
        if total_reviews >= 3 and avg_rating < 3.0:
            return 'critical'
        if total_reviews >= 3 and avg_rating < 3.5:
            return 'warning'
        if total_reviews == 0:
            return 'new'
        return 'healthy'

    @classmethod
    def _serialize_review(cls, rev, r_val, g_rating, is_low, photos, vendor_reply, replied_at, meta):
        reports = list(meta.get('reports') or [])
        order_code = (
            rev.order_vendor.order.order_code
            if rev.order_vendor and getattr(rev.order_vendor, 'order', None)
            else f'OV-{rev.order_vendor_id}'
        )
        return {
            'id': rev.id,
            'status': rev.status,
            'status_label': STATUS_LABELS.get(rev.status, rev.status),
            'tour_id': rev.tour_id,
            'tour_title': rev.tour.title if rev.tour else 'Trải nghiệm Sơn Trà',
            'vendor_id': rev.vendor_id,
            'vendor_name': rev.vendor.brand_name if rev.vendor else 'Đối tác Sơn Trà',
            'guide_id': rev.guide_id,
            'guide_name': (
                rev.guide.user.name
                if (rev.guide and getattr(rev.guide, 'user', None))
                else None
            ),
            'guide_rating': g_rating,
            'order_vendor_id': rev.order_vendor_id,
            'order_code': order_code,
            'customer_name': getattr(rev.customer, 'name', None) or 'Du khách',
            'customer_email': getattr(rev.customer, 'email', '') or '',
            'rating': r_val,
            'tour_rating': r_val,
            'tour_tags': meta.get('tour_tags') or [],
            'guide_tags': meta.get('guide_tags') or [],
            'low_rating_reasons': meta.get('low_rating_reasons') or [],
            'is_low_rating': is_low,
            'comment': rev.comment or '',
            'images': photos,
            'vendor_reply': vendor_reply,
            'replied_at': replied_at,
            'edited_at': meta.get('edited_at'),
            'reports': reports,
            'reports_count': len(reports),
            'moderation_note': meta.get('moderation_note') or '',
            'moderated_at': meta.get('moderated_at'),
            'created_at': rev.created_at.strftime('%d/%m/%Y %H:%M') if rev.created_at else '',
        }

    @classmethod
    def list_reviews(cls, tab='all', vendor_id=None, tour_id=None, rating=None, search=''):
        qs = (
            Reviews.objects.select_related('customer', 'vendor', 'tour', 'guide__user', 'order_vendor__order')
            .order_by('-created_at', '-id')
        )
        all_reviews = list(qs)

        approved_count = 0
        approved_sum = 0
        pending_count = 0
        reported_count = 0
        low_rating_count = 0
        rejected_count = 0
        parsed_rows = []

        for rev in all_reviews:
            r_val = max(1, min(5, int(rev.rating or 5)))
            photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            g_rating = meta.get('guide_rating')
            is_low = (r_val <= 2) or (g_rating is not None and int(g_rating) <= 2)
            reports = meta.get('reports') or []

            if rev.status == 'approved':
                approved_count += 1
                approved_sum += r_val
                if is_low:
                    low_rating_count += 1
            elif rev.status == 'pending_approval':
                pending_count += 1
            elif rev.status == 'rejected':
                rejected_count += 1

            if len(reports) > 0 and rev.status != 'rejected':
                reported_count += 1

            parsed_rows.append((rev, r_val, g_rating, is_low, photos, vendor_reply, replied_at, meta))

        flagged_tours = []
        tour_options = []
        for t in Tours.objects.filter(deleted_at__isnull=True, vendor__deleted_at__isnull=True).select_related('vendor').order_by('title', 'id'):
            tour_options.append({'id': t.id, 'title': t.title, 'vendor_id': t.vendor_id})
            t_reviews = int(t.total_reviews or 0)
            t_avg = float(t.avg_rating) if t_reviews > 0 else 0.0
            q_level = cls._quality_level(t_avg, t_reviews)
            if q_level in ('critical', 'warning'):
                flagged_tours.append({
                    'id': t.id,
                    'title': t.title,
                    'vendor_id': t.vendor_id,
                    'vendor_name': t.vendor.brand_name if t.vendor else 'Đối tác Sơn Trà',
                    'avg_rating': t_avg,
                    'total_reviews': t_reviews,
                    'quality_level': q_level,
                })

        flagged_vendors = []
        vendor_options = []
        for v in Vendors.objects.filter(deleted_at__isnull=True, status='approved').order_by('brand_name', 'id'):
            vendor_options.append({'id': v.id, 'brand_name': v.brand_name})
            v_reviews = int(v.total_reviews or 0)
            v_avg = float(v.avg_rating) if v_reviews > 0 else 0.0
            q_level = cls._quality_level(v_avg, v_reviews)
            if q_level in ('critical', 'warning'):
                flagged_vendors.append({
                    'id': v.id,
                    'brand_name': v.brand_name,
                    'avg_rating': v_avg,
                    'total_reviews': v_reviews,
                    'quality_level': q_level,
                })

        tab_key = str(tab or 'all').strip().lower()
        filter_vendor_id = int(vendor_id) if vendor_id and str(vendor_id).isdigit() else None
        filter_tour_id = int(tour_id) if tour_id and str(tour_id).isdigit() else None
        filter_star = int(rating) if rating and str(rating).isdigit() and 1 <= int(rating) <= 5 else None
        q = str(search or '').strip().lower()

        results = []
        for row in parsed_rows:
            rev, r_val, g_rating, is_low, photos, vendor_reply, replied_at, meta = row
            reports = meta.get('reports') or []

            if tab_key == 'pending_approval' and rev.status != 'pending_approval':
                continue
            if tab_key == 'reported' and not (len(reports) > 0 and rev.status != 'rejected'):
                continue
            if tab_key == 'low_rating' and not (rev.status == 'approved' and is_low):
                continue
            if tab_key == 'rejected' and rev.status != 'rejected':
                continue

            if filter_vendor_id is not None and rev.vendor_id != filter_vendor_id:
                continue
            if filter_tour_id is not None and rev.tour_id != filter_tour_id:
                continue
            if filter_star is not None and r_val != filter_star:
                continue

            serialized = cls._serialize_review(*row)
            if q:
                haystack = ' '.join([
                    serialized['order_code'],
                    serialized['customer_name'],
                    serialized['tour_title'],
                    serialized['vendor_name'],
                    serialized['guide_name'] or '',
                    serialized['comment'],
                ]).lower()
                if q not in haystack:
                    continue

            results.append(serialized)

        return {
            'summary': {
                'avg_rating': round(approved_sum / approved_count, 2) if approved_count > 0 else 0.0,
                'total_approved': approved_count,
                'pending_approval_count': pending_count,
                'reported_count': reported_count,
                'low_rating_count': low_rating_count,
                'rejected_count': rejected_count,
                'all_count': len(all_reviews),
                'attention_count': pending_count + reported_count,
                'flagged_tours_count': len(flagged_tours),
            },
            'flagged_tours': flagged_tours,
            'flagged_vendors': flagged_vendors,
            'vendors': vendor_options,
            'tours': tour_options,
            'results': results,
        }

    @classmethod
    def moderate_review(cls, review_id, actor, action, note=''):
        if getattr(actor, 'role', '') not in ('system_admin', 'staff'):
            raise PermissionDenied('Chỉ Ban Quản Lý mới có quyền kiểm duyệt đánh giá.')

        clean_action = str(action or '').strip().lower()
        if clean_action not in ('approve', 'reject', 'dismiss_reports'):
            raise ValidationError('Thao tác kiểm duyệt không hợp lệ.')

        clean_note = str(note or '').strip()[:500]
        if clean_action == 'reject' and not clean_note:
            raise ValidationError('Vui lòng nhập lý do ẩn hoặc từ chối đánh giá.')

        with transaction.atomic():
            rev = (
                Reviews.objects.select_for_update(of=('self',))
                .select_related('customer', 'vendor', 'tour', 'guide__user', 'order_vendor__order')
                .filter(id=int(review_id))
                .first()
            )
            if not rev:
                raise NotFound('Không tìm thấy đánh giá yêu cầu.')

            prev_status = rev.status
            photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            now_str = timezone.localtime().strftime('%d/%m/%Y %H:%M')

            if clean_action == 'approve':
                rev.status = 'approved'
                meta['reports'] = []
                if clean_note:
                    meta['moderation_note'] = clean_note
                meta['moderated_at'] = now_str
            elif clean_action == 'reject':
                rev.status = 'rejected'
                meta['moderation_note'] = clean_note
                meta['moderated_at'] = now_str
            elif clean_action == 'dismiss_reports':
                if rev.status != 'approved':
                    raise ValidationError('Chỉ có thể bỏ qua báo cáo đối với đánh giá đang hiển thị.')
                meta['reports'] = []
                meta['moderation_note'] = clean_note or 'BQL đã xác minh và giữ nguyên đánh giá.'
                meta['moderated_at'] = now_str

            rev.images = build_review_images_payload(
                photos,
                meta=meta,
                vendor_reply=vendor_reply,
                replied_at=replied_at,
            )
            rev.save(update_fields=['status', 'images', 'updated_at'])

            if rev.tour_id:
                locked_tour = Tours.objects.select_for_update().filter(id=rev.tour_id).first()
                if locked_tour:
                    agg = Reviews.objects.filter(tour=locked_tour, status='approved').aggregate(
                        avg=Avg('rating'), cnt=Count('id')
                    )
                    cnt = int(agg['cnt'] or 0)
                    locked_tour.avg_rating = (
                        Decimal(str(round(float(agg['avg'] or 0), 2))) if cnt > 0 else Decimal('0.00')
                    )
                    locked_tour.total_reviews = cnt
                    locked_tour.save(update_fields=['avg_rating', 'total_reviews', 'updated_at'])

            TourService._sync_vendor_and_guide_ratings(rev.vendor_id, rev.guide_id)

            if clean_action == 'approve' and prev_status == 'pending_approval' and rev.customer_id:
                already_rewarded = PointsLedger.objects.filter(
                    user_id=rev.customer_id,
                    order_vendor_id=rev.order_vendor_id,
                    reference_type='tour_review_reward',
                ).exists()
                if not already_rewarded:
                    tour_title = rev.tour.title if rev.tour else 'Trải nghiệm Sơn Trà'
                    PointsLedger.objects.create(
                        user=rev.customer,
                        vendor=None,
                        points_change=10,
                        reason=f'Thưởng đánh giá hành trình (đã duyệt): {tour_title[:80]}',
                        reference_type='tour_review_reward',
                        order_vendor=rev.order_vendor,
                    )
                Notifications.objects.create(
                    user=rev.customer,
                    notification_type='system',
                    title='Đánh giá chuyến đi đã được phê duyệt',
                    body=f'Đánh giá của bạn cho tuyến "{rev.tour.title if rev.tour else "Sơn Trà"}" đã được BQL phê duyệt hiển thị.',
                )
            elif clean_action == 'reject' and rev.customer_id:
                Notifications.objects.create(
                    user=rev.customer,
                    notification_type='system',
                    title='Đánh giá chưa phù hợp quy chuẩn cộng đồng',
                    body=f'Đánh giá của bạn đã bị ẩn bởi BQL. Lý do: {clean_note}',
                )

            r_val = max(1, min(5, int(rev.rating or 5)))
            g_rating = meta.get('guide_rating')
            is_low = (r_val <= 2) or (g_rating is not None and int(g_rating) <= 2)
            return cls._serialize_review(rev, r_val, g_rating, is_low, photos, vendor_reply, replied_at, meta)
