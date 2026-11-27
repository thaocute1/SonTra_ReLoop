from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Sum, Count, Prefetch
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.flash_sales.serializers.flash_sale_serializers import CampaignSessionDetailSerializer, CampaignDetailSerializer, CampaignItemDetailSerializer
from apps.flash_sales.services.pricing import normalize_price_tiers, compute_tier_state, calculate_tiered_quote
from apps.flash_sales.services.realtime_stream import publish_flash_sale_event
from apps.tours.models import Tours
from apps.vendors.models import Vendors
from apps.accounts.models.notification_models import Notifications


class FlashSaleService:
    AUTO_EXTEND_WINDOW_MINUTES = 5
    AUTO_EXTEND_MIN_REMAINING_RATIO = 0.20
    DEFAULT_MAX_TICKETS_PER_CUSTOMER = 4

    @classmethod
    def get_max_tickets_per_customer(cls):
        from django.conf import settings
        return max(1, int(getattr(settings, 'FLASH_SALE_MAX_TICKETS_PER_CUSTOMER', cls.DEFAULT_MAX_TICKETS_PER_CUSTOMER)))

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
    def maybe_auto_extend_session(cls, session, now=None):
        """
        Auto-extend an active session once by max_extend_minutes when:
        - auto_extend_enabled is True and extend_count < 1
        - current time is within the final 5 minutes before end_time (or within max_extend_minutes past end_time)
        - more than 20% of approved slots remain unsold
        """
        if not session or getattr(session, 'auto_extend_enabled', False) is not True:
            return False
        session_id = getattr(session, 'id', None)
        extend_count = getattr(session, 'extend_count', None)
        max_extend = getattr(session, 'max_extend_minutes', None)
        if not isinstance(session_id, int) or not isinstance(extend_count, int) or not isinstance(max_extend, int):
            return False
        if extend_count >= 1 or max_extend <= 0:
            return False
        if getattr(session, 'status', None) not in ('upcoming', 'active'):
            return False
        campaign = getattr(session, 'campaign', None)
        if not campaign or getattr(campaign, 'status', None) != 'active':
            return False

        now = now or timezone.now()
        start_time = getattr(session, 'start_time', None)
        end_time = getattr(session, 'end_time', None)
        if not start_time or not end_time or now < start_time:
            return False

        window_start = end_time - timedelta(minutes=cls.AUTO_EXTEND_WINDOW_MINUTES)
        window_end = end_time + timedelta(minutes=max_extend)
        if not (window_start <= now <= window_end):
            return False

        totals = CampaignItems.objects.filter(session_id=session_id, status='approved').aggregate(
            total_slots=Sum('slot_quantity'),
            total_sold=Sum('sold_quantity'),
        )
        total_slots = totals['total_slots'] or 0
        total_sold = totals['total_sold'] or 0
        if total_slots <= 0 or (total_slots - total_sold) / total_slots <= cls.AUTO_EXTEND_MIN_REMAINING_RATIO:
            return False

        with transaction.atomic():
            locked = (
                CampaignSessions.objects.select_for_update()
                .filter(id=session_id, auto_extend_enabled=True, extend_count__lt=1)
                .first()
            )
            if not locked:
                return False
            locked.end_time = locked.end_time + timedelta(minutes=locked.max_extend_minutes)
            locked.extend_count = locked.extend_count + 1
            locked.save(update_fields=['end_time', 'extend_count', 'updated_at'])
            session.end_time = locked.end_time
            session.extend_count = locked.extend_count
            extended_session_id = locked.id
            transaction.on_commit(
                lambda: publish_flash_sale_event('session_extended', {'session_id': extended_session_id})
            )
            return True

    @classmethod
    def get_active_session(cls):
        now = timezone.now()
        # The vendor registration deadline does not close the sale for customers.
        active_campaign_sessions = CampaignSessions.objects.filter(campaign__status='active')
        live = active_campaign_sessions.filter(start_time__lte=now, end_time__gte=now, status__in=['active', 'upcoming']).order_by('-start_time').first()
        if live:
            cls.maybe_auto_extend_session(live, now)
            session_data = CampaignSessionDetailSerializer(live).data
            session_data['status'] = 'active'
            return {'has_session': True, 'session_type': 'live', 'session': session_data}

        extend_candidate = (
            CampaignSessions.objects.select_related('campaign')
            .filter(
                campaign__status='active',
                auto_extend_enabled=True,
                extend_count__lt=1,
                start_time__lte=now,
                end_time__lt=now,
                status__in=['active', 'upcoming'],
            )
            .order_by('-end_time')
            .first()
        )
        if extend_candidate and cls.maybe_auto_extend_session(extend_candidate, now) and extend_candidate.end_time >= now:
            session_data = CampaignSessionDetailSerializer(extend_candidate).data
            session_data['status'] = 'active'
            return {'has_session': True, 'session_type': 'live', 'session': session_data}

        upcoming = active_campaign_sessions.filter(start_time__gt=now, status='upcoming').order_by('start_time').first()
        if upcoming:
            return {'has_session': True, 'session_type': 'upcoming', 'session': CampaignSessionDetailSerializer(upcoming).data}
        return {'has_session': False, 'session_type': 'none', 'session': None}

    @classmethod
    def get_admin_campaigns_overview(cls):
        now = timezone.now()
        extendable_sessions = CampaignSessions.objects.select_related('campaign').filter(
            campaign__status='active',
            auto_extend_enabled=True,
            extend_count__lt=1,
            start_time__lte=now,
            status__in=['active', 'upcoming'],
        )
        for sess in extendable_sessions:
            cls.maybe_auto_extend_session(sess, now)

        session_qs = (
            CampaignSessions.objects.select_related('campaign')
            .annotate(
                prefetched_items_total_slots=Sum('campaignitems__slot_quantity'),
                prefetched_items_total_sold=Sum('campaignitems__sold_quantity'),
            )
            .prefetch_related(
                Prefetch('campaignitems_set', queryset=CampaignItems.objects.select_related('tour', 'vendor')),
            )
            .order_by('-start_time')
        )
        campaigns = list(
            Campaigns.objects.annotate(
                prefetched_total_sessions=Count('campaignsessions', distinct=True),
                prefetched_total_slots=Sum('campaignsessions__campaignitems__slot_quantity'),
                prefetched_total_sold=Sum('campaignsessions__campaignitems__sold_quantity'),
            )
            .prefetch_related(Prefetch('campaignsessions_set', queryset=session_qs))
            .order_by('-created_at')
        )
        items = CampaignItems.objects.all()
        totals = items.aggregate(
            total_slots=Sum('slot_quantity'),
            total_sold=Sum('sold_quantity'),
        )
        slots = totals['total_slots'] or 0
        sold = totals['total_sold'] or 0
        pending = list(
            items.filter(status='pending_approval').select_related('tour', 'vendor', 'session')
        )
        active_sessions = sum(
            1
            for camp in campaigns
            if camp.status == 'active'
            for sess in camp.campaignsessions_set.all()
            if sess.start_time <= now <= sess.end_time
        )
        return {
            'metrics': {
                'total_campaigns': len(campaigns),
                'active_sessions': active_sessions,
                'total_slots': slots,
                'total_sold': sold,
                'avg_fill_rate': round(sold / slots * 100) if slots else 0,
                'pending_items_count': len(pending),
            },
            'campaigns': CampaignDetailSerializer(campaigns, many=True).data,
            'pending_items': CampaignItemDetailSerializer(pending, many=True).data,
        }

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
        initial_status = data.get('status') if data.get('status') in ('draft', 'active') else 'draft'
        campaign = Campaigns.objects.create(title=title, description=data.get('description', ''), banner_url=data.get('banner_url', ''), registration_deadline=deadline, max_items_per_vendor=maximum, status=initial_status)
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
        auto_extend = bool(data.get('auto_extend_enabled', False))
        try:
            max_extend = int(data.get('max_extend_minutes', 30))
        except (TypeError, ValueError):
            raise ValueError('Thời gian tự động gia hạn không hợp lệ.')
        if auto_extend and (max_extend < 5 or max_extend > 180):
            raise ValueError('Thời gian tự động gia hạn phải từ 5 đến 180 phút.')
        session = CampaignSessions.objects.create(campaign=campaign, session_name=data.get('session_name', '').strip() or f'Giờ vàng {start:%d/%m}', start_time=start, end_time=end, auto_extend_enabled=auto_extend, max_extend_minutes=max_extend, dynamic_pricing_enabled=bool(data.get('dynamic_pricing_enabled', False)), status='upcoming')
        vendors = Vendors.objects.filter(status='approved', deleted_at__isnull=True).select_related('user')
        notices = [Notifications(user=vendor.user, notification_type='system', title='Có phiên Flash Sale mới', body=f'Chiến dịch "{campaign.title}" vừa mở phiên "{session.session_name}". Hãy đăng ký tour trước hạn {timezone.localtime(campaign.registration_deadline):%d/%m/%Y %H:%M}.') for vendor in vendors]
        if notices:
            Notifications.objects.bulk_create(notices)
        publish_flash_sale_event('session_created', {'session_id': session.id, 'campaign_id': campaign.id})
        return CampaignSessionDetailSerializer(session).data

    @classmethod
    def register_tour_item(cls, data, vendor_user):
        try:
            session_id = int(data.get('session_id'))
            tour_id = int(data.get('tour_id'))
        except (TypeError, ValueError):
            raise ValueError('Phiên Flash Sale hoặc tour không hợp lệ.')

        now = timezone.now()
        with transaction.atomic():
            session = CampaignSessions.objects.select_related('campaign').filter(id=session_id).first()
            if not session:
                raise ValueError('Không tìm thấy phiên Flash Sale.')
            campaign = Campaigns.objects.select_for_update().get(id=session.campaign_id)
            if campaign.status in {'paused', 'ended'} or campaign.registration_deadline <= now:
                raise ValueError('Chiến dịch không còn nhận đăng ký.')
            if session.status not in {'upcoming', 'active'} or session.end_time <= now:
                raise ValueError('Phiên này không còn nhận đăng ký.')

            vendor = Vendors.objects.select_for_update().filter(
                user_id=vendor_user.id, status='approved', deleted_at__isnull=True
            ).first()
            if not vendor:
                raise ValueError('Tài khoản chưa có hồ sơ đối tác đã được duyệt.')

            tour = Tours.objects.filter(
                id=tour_id, vendor=vendor, status='published', deleted_at__isnull=True
            ).first()
            if not tour:
                raise ValueError('Tour không tồn tại, chưa được xuất bản, hoặc không thuộc đơn vị của bạn.')
            if int(getattr(tour, 'total_reviews', 0) or 0) >= 3 and float(getattr(tour, 'avg_rating', 0) or 0) < 3.5:
                raise ValueError(
                    'Tour đang có điểm đánh giá trung bình dưới 3.5★ (từ 3 đánh giá trở lên) nên tạm thời chưa đủ điều kiện tham gia Flash Sale.'
                )

            raw_tiers = data.get('price_tiers')
            normalized_tiers = None
            if raw_tiers is not None and raw_tiers != []:
                if not getattr(session, 'dynamic_pricing_enabled', False):
                    raise ValueError('Phiên Flash Sale này chưa bật chế độ định giá theo bậc.')
                normalized_tiers, promo, quantity = normalize_price_tiers(raw_tiers, tour.price)
            else:
                try:
                    promo, quantity = Decimal(str(data.get('promo_price'))), int(data.get('slot_quantity'))
                except (InvalidOperation, TypeError, ValueError):
                    raise ValueError('Giá ưu đãi hoặc số suất không hợp lệ.')
                if promo <= 0 or promo >= tour.price:
                    raise ValueError('Giá ưu đãi phải lớn hơn 0 và thấp hơn giá niêm yết.')
                if quantity < 1:
                    raise ValueError('Số suất phải lớn hơn 0.')

            existing = CampaignItems.objects.select_for_update().filter(session=session, tour=tour).first()
            if existing:
                if existing.status == 'approved':
                    raise ValueError('Tour này đã được duyệt trong phiên và không thể chỉnh sửa.')
                existing.promo_price = promo
                existing.slot_quantity = quantity
                existing.price_tiers = normalized_tiers
                existing.status = 'pending_approval'
                existing.save(update_fields=['promo_price', 'slot_quantity', 'price_tiers', 'status', 'updated_at'])
                publish_flash_sale_event('item_registered', {'session_id': session.id, 'item_id': existing.id})
                return CampaignItemDetailSerializer(existing).data

            count = CampaignItems.objects.filter(
                vendor=vendor,
                session__campaign=campaign,
                status__in=['pending_approval', 'approved'],
            ).count()
            if count >= campaign.max_items_per_vendor:
                raise ValueError('Bạn đã đạt giới hạn tour được đăng ký trong chiến dịch này.')

            item = CampaignItems.objects.create(
                session=session,
                vendor=vendor,
                tour=tour,
                promo_price=promo,
                slot_quantity=quantity,
                sold_quantity=0,
                price_tiers=normalized_tiers,
                status='pending_approval',
            )
            publish_flash_sale_event('item_registered', {'session_id': session.id, 'item_id': item.id})
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
        publish_flash_sale_event('item_reviewed', {'session_id': item.session_id, 'item_id': item.id, 'action': action})
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
        publish_flash_sale_event('campaign_status_changed', {'campaign_id': campaign.id, 'status': new_status})
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
