from decimal import Decimal, InvalidOperation
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import NotFound, ValidationError

from apps.tours.models import Checkpoints, Tours
from ..models.challenge_models import ChallengeAttempts, ChallengeCheckpoints, Challenges

ACTIVITY_LABELS = {
    'trash_pickup': 'Thu gom rác thải',
    'tree_planting': 'Trồng cây & phục hồi',
    'other': 'Hoạt động sinh thái khác',
}

MISSION_TYPE_LABELS = {
    'eco_action': 'Hành động xanh (Ảnh minh chứng)',
    'checkin_gps': 'Check-in GPS theo tour',
}


def _parse_optional_datetime(raw):
    if raw in (None, ''):
        return None
    if hasattr(raw, 'year'):
        return raw
    dt = parse_datetime(str(raw).strip())
    if dt is None:
        raise ValidationError('Định dạng thời gian hiệu lực không hợp lệ.')
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


class AdminMissionService:
    """Nghiệp vụ Admin / BQL tạo, cập nhật, bật-tắt và quản lý Nhiệm vụ xanh."""

    @staticmethod
    def serialize_mission(challenge, stats=None, checkpoints=None):
        st = stats or {}
        return {
            'id': challenge.id,
            'title': challenge.title,
            'description': challenge.description or '',
            'banner_url': challenge.banner_url or '',
            'reward_points': int(challenge.reward_points or 0),
            'is_active': bool(challenge.is_active),
            'mission_type': challenge.mission_type,
            'mission_type_label': MISSION_TYPE_LABELS.get(challenge.mission_type, challenge.mission_type),
            'scope': challenge.scope,
            'eco_activity_type': challenge.eco_activity_type or '',
            'eco_activity_label': ACTIVITY_LABELS.get(challenge.eco_activity_type or '', 'Chưa phân loại'),
            'target_weight_kg': float(challenge.target_weight_kg) if challenge.target_weight_kg is not None else None,
            'time_limit_minutes': challenge.time_limit_minutes,
            'badge_name': challenge.badge_name or '',
            'badge_icon_url': challenge.badge_icon_url or '',
            'badge_description': challenge.badge_description or '',
            'tour_id': challenge.tour_id,
            'tour_title': challenge.tour.title if getattr(challenge, 'tour', None) else None,
            'vendor_id': challenge.vendor_id,
            'vendor_name': challenge.vendor.brand_name if getattr(challenge, 'vendor', None) else None,
            'approval_status': challenge.approval_status,
            'valid_from': challenge.valid_from.isoformat() if challenge.valid_from else None,
            'valid_to': challenge.valid_to.isoformat() if challenge.valid_to else None,
            'checkpoints': checkpoints or [],
            'attempts_count': int(st.get('attempts_count', 0)),
            'completed_count': int(st.get('completed_count', 0)),
            'pending_count': int(st.get('pending_count', 0)),
            'created_at': challenge.created_at.strftime('%d/%m/%Y %H:%M') if challenge.created_at else '',
        }

    @classmethod
    def list_missions_and_options(cls):
        challenges = list(
            Challenges.objects.filter(deleted_at__isnull=True)
            .select_related('tour', 'vendor')
            .order_by('-created_at', '-id')
        )
        challenge_ids = [c.id for c in challenges]

        stats_map = {}
        if challenge_ids:
            for row in (
                ChallengeAttempts.objects.filter(challenge_id__in=challenge_ids)
                .values('challenge_id')
                .annotate(
                    attempts_count=Count('id'),
                    completed_count=Count('id', filter=Q(status='completed')),
                    pending_count=Count('id', filter=Q(status='pending_review')),
                )
            ):
                stats_map[row['challenge_id']] = row

        cp_map = {}
        if challenge_ids:
            for link in (
                ChallengeCheckpoints.objects.filter(challenge_id__in=challenge_ids)
                .select_related('checkpoint')
                .order_by('order_index')
            ):
                cp_map.setdefault(link.challenge_id, []).append({
                    'id': link.checkpoint_id,
                    'name': link.checkpoint.name if link.checkpoint else f'Checkpoint #{link.checkpoint_id}',
                    'order_index': link.order_index,
                })

        tours_list = []
        for tour in (
            Tours.objects.filter(deleted_at__isnull=True, status='published')
            .select_related('vendor', 'routes')
            .prefetch_related('routes__checkpoints')
            .order_by('title', 'id')
        ):
            try:
                route = tour.routes
            except ObjectDoesNotExist:
                route = None
            checkpoints = []
            if route:
                for cp in sorted(route.checkpoints.all(), key=lambda x: (x.order_index, x.id)):
                    checkpoints.append({
                        'id': cp.id,
                        'name': cp.name,
                        'order_index': cp.order_index,
                    })
            tours_list.append({
                'id': tour.id,
                'title': tour.title,
                'vendor_name': tour.vendor.brand_name if tour.vendor else 'Đối tác Sơn Trà',
                'checkpoints': checkpoints,
            })

        return {
            'missions': [
                cls.serialize_mission(c, stats=stats_map.get(c.id), checkpoints=cp_map.get(c.id))
                for c in challenges
            ],
            'tours': tours_list,
        }

    @classmethod
    def _validate_payload(cls, data, existing=None):
        title = str(data.get('title') if 'title' in data else (existing.title if existing else '') or '').strip()
        if not title:
            raise ValidationError({'title': 'Vui lòng nhập tiêu đề nhiệm vụ xanh.'})
        if len(title) > 255:
            raise ValidationError({'title': 'Tiêu đề nhiệm vụ tối đa 255 ký tự.'})

        mission_type = str(
            data.get('mission_type')
            if 'mission_type' in data
            else (existing.mission_type if existing else 'eco_action')
        ).strip()
        if mission_type not in ('eco_action', 'checkin_gps'):
            raise ValidationError({'mission_type': 'Loại nhiệm vụ phải là eco_action hoặc checkin_gps.'})

        raw_points = data.get('reward_points') if 'reward_points' in data else (existing.reward_points if existing else 100)
        try:
            reward_points = int(raw_points)
        except (TypeError, ValueError):
            raise ValidationError({'reward_points': 'Điểm thưởng phải là số nguyên.'})
        if reward_points < 1 or reward_points > 10000:
            raise ValidationError({'reward_points': 'Điểm thưởng phải từ 1 đến 10.000 RE-Points.'})

        raw_tour_id = data.get('tour_id') if 'tour_id' in data else (existing.tour_id if existing else None)
        tour = None
        if mission_type == 'checkin_gps':
            if not raw_tour_id or not str(raw_tour_id).isdigit():
                raise ValidationError({'tour_id': 'Nhiệm vụ Check-in GPS cần chọn tuyến tour áp dụng.'})
            tour = Tours.objects.select_related('vendor').filter(id=int(raw_tour_id), deleted_at__isnull=True).first()
            if not tour:
                raise ValidationError({'tour_id': 'Không tìm thấy tuyến tour đã chọn.'})
        elif raw_tour_id and str(raw_tour_id).isdigit():
            tour = Tours.objects.select_related('vendor').filter(id=int(raw_tour_id), deleted_at__isnull=True).first()

        scope = 'tour' if tour else 'open'

        eco_activity = str(
            data.get('eco_activity_type')
            if 'eco_activity_type' in data
            else (existing.eco_activity_type if existing else 'trash_pickup')
        ).strip()
        if mission_type == 'eco_action':
            if eco_activity not in ('trash_pickup', 'tree_planting', 'other', ''):
                raise ValidationError({'eco_activity_type': 'Loại hoạt động xanh không hợp lệ.'})
            eco_activity = eco_activity or 'trash_pickup'
        else:
            eco_activity = None

        raw_weight = data.get('target_weight_kg') if 'target_weight_kg' in data else (existing.target_weight_kg if existing else None)
        target_weight = None
        if mission_type == 'eco_action' and eco_activity == 'trash_pickup' and raw_weight not in (None, ''):
            try:
                target_weight = Decimal(str(raw_weight))
            except (InvalidOperation, ValueError):
                raise ValidationError({'target_weight_kg': 'Mục tiêu khối lượng (kg) không hợp lệ.'})
            if target_weight < 0:
                raise ValidationError({'target_weight_kg': 'Mục tiêu khối lượng không được âm.'})

        raw_limit = data.get('time_limit_minutes') if 'time_limit_minutes' in data else (existing.time_limit_minutes if existing else None)
        time_limit = None
        if raw_limit not in (None, ''):
            try:
                time_limit = int(raw_limit)
            except (TypeError, ValueError):
                raise ValidationError({'time_limit_minutes': 'Giới hạn thời gian phải là số nguyên (phút).'})
            if time_limit <= 0:
                raise ValidationError({'time_limit_minutes': 'Giới hạn thời gian phải lớn hơn 0 phút.'})

        valid_from = _parse_optional_datetime(data['valid_from']) if 'valid_from' in data else (existing.valid_from if existing else None)
        valid_to = _parse_optional_datetime(data['valid_to']) if 'valid_to' in data else (existing.valid_to if existing else None)
        if valid_from and valid_to and valid_to < valid_from:
            raise ValidationError({'valid_to': 'Thời điểm kết thúc phải sau thời điểm bắt đầu.'})

        badge_name = str(
            data.get('badge_name')
            if 'badge_name' in data
            else (existing.badge_name if existing else '')
        ).strip() or title[:80]

        is_active = bool(data.get('is_active')) if 'is_active' in data else (bool(existing.is_active) if existing else True)

        checkpoint_ids = None
        if 'checkpoint_ids' in data:
            raw_ids = data.get('checkpoint_ids') or []
            if not isinstance(raw_ids, list):
                raise ValidationError({'checkpoint_ids': 'Danh sách checkpoint không hợp lệ.'})
            checkpoint_ids = [int(cid) for cid in raw_ids if str(cid).isdigit()]

        return {
            'title': title,
            'description': str(data.get('description') if 'description' in data else (existing.description if existing else '') or '').strip(),
            'banner_url': str(data.get('banner_url') if 'banner_url' in data else (existing.banner_url if existing else '') or '').strip(),
            'reward_points': reward_points,
            'is_active': is_active,
            'mission_type': mission_type,
            'scope': scope,
            'eco_activity_type': eco_activity,
            'target_weight_kg': target_weight,
            'time_limit_minutes': time_limit,
            'valid_from': valid_from,
            'valid_to': valid_to,
            'badge_name': badge_name[:255],
            'badge_icon_url': str(data.get('badge_icon_url') if 'badge_icon_url' in data else (existing.badge_icon_url if existing else '') or '').strip(),
            'badge_description': str(data.get('badge_description') if 'badge_description' in data else (existing.badge_description if existing else '') or '').strip(),
            'tour': tour,
            'vendor': tour.vendor if tour else None,
            'checkpoint_ids': checkpoint_ids,
        }

    @classmethod
    def create_mission(cls, data, actor):
        cleaned = cls._validate_payload(data)
        checkpoint_ids = cleaned.pop('checkpoint_ids')

        with transaction.atomic():
            challenge = Challenges.objects.create(
                **cleaned,
                approval_status='approved',
                approved_by_admin=actor,
                approved_at=timezone.now(),
            )
            if cleaned['mission_type'] == 'checkin_gps' and checkpoint_ids:
                valid_cps = list(Checkpoints.objects.filter(id__in=checkpoint_ids))
                cp_by_id = {cp.id: cp for cp in valid_cps}
                for idx, cid in enumerate(checkpoint_ids, start=1):
                    if cid in cp_by_id:
                        ChallengeCheckpoints.objects.create(
                            challenge=challenge,
                            checkpoint=cp_by_id[cid],
                            order_index=idx,
                            is_required=True,
                        )
        return cls.serialize_mission(challenge)

    @classmethod
    def update_mission(cls, mission_id, data):
        challenge = Challenges.objects.filter(id=int(mission_id), deleted_at__isnull=True).select_related('tour', 'vendor').first()
        if not challenge:
            raise NotFound('Không tìm thấy nhiệm vụ xanh.')

        # Support fast toggle of is_active without requiring all fields
        if set(data.keys()) <= {'is_active'}:
            with transaction.atomic():
                challenge.is_active = bool(data.get('is_active'))
                challenge.save(update_fields=['is_active', 'updated_at'])
            return cls.serialize_mission(challenge)

        cleaned = cls._validate_payload(data, existing=challenge)
        checkpoint_ids = cleaned.pop('checkpoint_ids')

        with transaction.atomic():
            for field, val in cleaned.items():
                setattr(challenge, field, val)
            challenge.save()

            if checkpoint_ids is not None:
                ChallengeCheckpoints.objects.filter(challenge=challenge).delete()
                if cleaned['mission_type'] == 'checkin_gps' and checkpoint_ids:
                    valid_cps = list(Checkpoints.objects.filter(id__in=checkpoint_ids))
                    cp_by_id = {cp.id: cp for cp in valid_cps}
                    for idx, cid in enumerate(checkpoint_ids, start=1):
                        if cid in cp_by_id:
                            ChallengeCheckpoints.objects.create(
                                challenge=challenge,
                                checkpoint=cp_by_id[cid],
                                order_index=idx,
                                is_required=True,
                            )

        return cls.serialize_mission(challenge)

    @classmethod
    def delete_mission(cls, mission_id):
        challenge = Challenges.objects.filter(id=int(mission_id), deleted_at__isnull=True).first()
        if not challenge:
            raise NotFound('Không tìm thấy nhiệm vụ xanh.')
        challenge.deleted_at = timezone.now()
        challenge.is_active = False
        challenge.save(update_fields=['deleted_at', 'is_active', 'updated_at'])
