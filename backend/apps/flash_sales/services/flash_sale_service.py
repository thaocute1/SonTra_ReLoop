from decimal import Decimal, InvalidOperation

from django.db.models import Sum, Count, Prefetch
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.flash_sales.serializers.flash_sale_serializers import CampaignSessionDetailSerializer, CampaignDetailSerializer, CampaignItemDetailSerializer
from apps.tours.models import Tours
from apps.vendors.models import Vendors
from apps.accounts.models.notification_models import Notifications


class FlashSaleService:
    @staticmethod
    def _datetime(value, field_name):
        if not value:
            raise ValueError(f'{field_name} là bắt buộc.')
        if not isinstance(value, str):
            return value
        parsed = parse_datetime(value)
        if not parsed:
            raise ValueError(f'{field_name} không hợp lệ.')
        return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed

    @classmethod
    def get_active_session(cls):
        now = timezone.now()
        live = CampaignSessions.objects.filter(campaign__status='active', start_time__lte=now, end_time__gte=now, status__in=['active', 'upcoming']).filter(campaign__registration_deadline__gt=now).order_by('-start_time').first()
        if live:
            if live.status != 'active':
                live.status = 'active'
                live.save(update_fields=['status'])
            return {'has_session': True, 'session_type': 'live', 'session': CampaignSessionDetailSerializer(live).data}
        upcoming = CampaignSessions.objects.filter(campaign__status='active', campaign__registration_deadline__gt=now, start_time__gt=now, status='upcoming').order_by('start_time').first()
        if upcoming:
            return {'has_session': True, 'session_type': 'upcoming', 'session': CampaignSessionDetailSerializer(upcoming).data}
        return {'has_session': False, 'session_type': 'none', 'session': None}

    @classmethod
    def get_admin_campaigns_overview(cls):
        now = timezone.now()
        campaigns = Campaigns.objects.annotate(
            prefetched_total_sessions=Count('campaignsessions', distinct=True),
            prefetched_total_slots=Sum('campaignsessions__campaignitems__slot_quantity'),
            prefetched_total_sold=Sum('campaignsessions__campaignitems__sold_quantity'),
        ).prefetch_related(
            Prefetch('campaignsessions_set', queryset=CampaignSessions.objects.prefetch_related(
                Prefetch('campaignitems_set', queryset=CampaignItems.objects.select_related('tour', 'vendor')),
            ).order_by('-start_time')),
        ).order_by('-created_at')
        items = CampaignItems.objects.all()
        slots = items.aggregate(total=Sum('slot_quantity'))['total'] or 0
        sold = items.aggregate(sold=Sum('sold_quantity'))['sold'] or 0
        pending = items.filter(status='pending_approval').select_related('tour', 'vendor', 'session')
        return {'metrics': {'total_campaigns': campaigns.count(), 'active_sessions': CampaignSessions.objects.filter(campaign__status='active', start_time__lte=now, end_time__gte=now).count(), 'total_slots': slots, 'total_sold': sold, 'avg_fill_rate': round(sold / slots * 100) if slots else 0, 'pending_items_count': pending.count()}, 'campaigns': CampaignDetailSerializer(campaigns, many=True).data, 'pending_items': CampaignItemDetailSerializer(pending, many=True).data}

    @classmethod
    def create_campaign(cls, data):
        title = data.get('title', '').strip()
        if not title:
            raise ValueError('Tiêu đề chiến dịch không được để trống.')
        deadline = cls._datetime(data.get('registration_deadline'), 'Hạn đăng ký')
        if deadline <= timezone.now():
            raise ValueError('Hạn đăng ký phải ở tương lai.')
        try:
            maximum = int(data.get('max_items_per_vendor', 3))
        except (TypeError, ValueError):
            raise ValueError('Giới hạn tour mỗi đối tác không hợp lệ.')
        if maximum < 1:
            raise ValueError('Giới hạn tour mỗi đối tác phải lớn hơn 0.')
        campaign = Campaigns.objects.create(title=title, description=data.get('description', ''), banner_url=data.get('banner_url', ''), registration_deadline=deadline, max_items_per_vendor=maximum, status='draft')
        return CampaignDetailSerializer(campaign).data

    @classmethod
    def create_session(cls, data):
        campaign = Campaigns.objects.filter(id=data.get('campaign_id')).first()
        if not campaign:
            raise ValueError('Không tìm thấy chiến dịch.')
        if campaign.status in {'paused', 'ended'}:
            raise ValueError('Không thể tạo phiên trong chiến dịch đang tạm dừng hoặc đã kết thúc.')
        start = cls._datetime(data.get('start_time'), 'Thời gian bắt đầu')
        end = cls._datetime(data.get('end_time'), 'Thời gian kết thúc')
        if start <= timezone.now() or end <= start:
            raise ValueError('Phiên phải bắt đầu trong tương lai và kết thúc sau thời điểm bắt đầu.')
        session = CampaignSessions.objects.create(campaign=campaign, session_name=data.get('session_name', '').strip() or f'Giờ vàng {start:%d/%m}', start_time=start, end_time=end, auto_extend_enabled=bool(data.get('auto_extend_enabled', False)), max_extend_minutes=int(data.get('max_extend_minutes', 30)), dynamic_pricing_enabled=bool(data.get('dynamic_pricing_enabled', False)), status='upcoming')
        vendors = Vendors.objects.filter(status='approved', deleted_at__isnull=True).select_related('user')
        notices = [Notifications(user=vendor.user, notification_type='system', title='Có phiên Flash Sale mới', body=f'Chiến dịch "{campaign.title}" vừa mở phiên "{session.session_name}". Hãy đăng ký tour trước hạn {timezone.localtime(campaign.registration_deadline):%d/%m/%Y %H:%M}.') for vendor in vendors]
        if notices:
            Notifications.objects.bulk_create(notices)
        return CampaignSessionDetailSerializer(session).data

    @classmethod
    def register_tour_item(cls, data, vendor_user):
        session = CampaignSessions.objects.select_related('campaign').filter(id=data.get('session_id')).first()
        now = timezone.now()
        if not session:
            raise ValueError('Không tìm thấy phiên Flash Sale.')
        if session.campaign.status in {'paused', 'ended'} or session.campaign.registration_deadline <= now:
            raise ValueError('Chiến dịch không còn nhận đăng ký.')
        if session.status not in {'upcoming', 'active'} or session.end_time <= now:
            raise ValueError('Phiên này không còn nhận đăng ký.')
        vendor = Vendors.objects.filter(user_id=vendor_user.id, status='approved', deleted_at__isnull=True).first()
        if not vendor:
            raise ValueError('Tài khoản chưa có hồ sơ đối tác đã được duyệt.')
        tour = Tours.objects.filter(id=data.get('tour_id'), vendor=vendor, status='published', deleted_at__isnull=True).first()
        if not tour:
            raise ValueError('Tour không tồn tại, chưa được xuất bản, hoặc không thuộc đơn vị của bạn.')
        try:
            promo, quantity = Decimal(str(data.get('promo_price'))), int(data.get('slot_quantity'))
        except (InvalidOperation, TypeError, ValueError):
            raise ValueError('Giá ưu đãi hoặc số suất không hợp lệ.')
        if promo <= 0 or promo >= tour.price:
            raise ValueError('Giá ưu đãi phải lớn hơn 0 và thấp hơn giá niêm yết.')
        if quantity < 1:
            raise ValueError('Số suất phải lớn hơn 0.')
        existing = CampaignItems.objects.filter(session=session, tour=tour).first()
        if existing:
            if existing.status == 'approved':
                raise ValueError('Tour này đã được duyệt trong phiên và không thể chỉnh sửa.')
            existing.promo_price, existing.slot_quantity, existing.status = promo, quantity, 'pending_approval'
            existing.save(update_fields=['promo_price', 'slot_quantity', 'status', 'updated_at'])
            return CampaignItemDetailSerializer(existing).data
        count = CampaignItems.objects.filter(vendor=vendor, session__campaign=session.campaign, status__in=['pending_approval', 'approved']).count()
        if count >= session.campaign.max_items_per_vendor:
            raise ValueError('Bạn đã đạt giới hạn tour được đăng ký trong chiến dịch này.')
        item = CampaignItems.objects.create(session=session, vendor=vendor, tour=tour, promo_price=promo, slot_quantity=quantity, sold_quantity=0, status='pending_approval')
        return CampaignItemDetailSerializer(item).data

    @classmethod
    def review_item(cls, item_id, action):
        item = CampaignItems.objects.filter(id=item_id).first()
        if not item:
            raise ValueError('Không tìm thấy tour đăng ký.')
        if item.status != 'pending_approval':
            raise ValueError('Chỉ có thể duyệt hoặc từ chối mục đang chờ duyệt.')
        if action not in {'approve', 'reject'}:
            raise ValueError('Thao tác duyệt không hợp lệ.')
        item.status = 'approved' if action == 'approve' else 'rejected'
        item.save(update_fields=['status', 'updated_at'])
        return CampaignItemDetailSerializer(item).data

    @classmethod
    def update_campaign_status(cls, campaign_id, new_status):
        if new_status not in {'active', 'paused', 'ended'}:
            raise ValueError('Trạng thái chiến dịch không hợp lệ.')
        campaign = Campaigns.objects.filter(id=campaign_id).first()
        if not campaign:
            raise ValueError('Không tìm thấy chiến dịch.')
        if new_status == 'active':
            if campaign.registration_deadline <= timezone.now():
                raise ValueError('Không thể mở chiến dịch sau hạn đăng ký.')
            if not campaign.campaignsessions_set.filter(end_time__gt=timezone.now()).exclude(status='ended').exists():
                raise ValueError('Cần có ít nhất một phiên chưa kết thúc trước khi mở chiến dịch.')
        campaign.status = new_status
        campaign.save(update_fields=['status', 'updated_at'])
        return CampaignDetailSerializer(campaign).data

    @classmethod
    def get_vendor_registration_context(cls, vendor_user):
        vendor = Vendors.objects.filter(user_id=vendor_user.id, deleted_at__isnull=True).first()
        if not vendor:
            raise ValueError('Không tìm thấy hồ sơ đối tác.')
        now = timezone.now()
        sessions = CampaignSessions.objects.exclude(campaign__status__in=['paused', 'ended']).filter(campaign__registration_deadline__gt=now, status__in=['upcoming', 'active'], end_time__gt=now).select_related('campaign').order_by('start_time')
        registrations = CampaignItems.objects.filter(vendor=vendor).select_related('tour', 'vendor', 'session', 'session__campaign').order_by('-updated_at')
        return {'sessions': CampaignSessionDetailSerializer(sessions, many=True).data, 'registrations': CampaignItemDetailSerializer(registrations, many=True).data}
