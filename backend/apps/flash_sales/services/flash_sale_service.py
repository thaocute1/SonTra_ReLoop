from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.flash_sales.serializers.flash_sale_serializers import (
    CampaignSessionDetailSerializer,
    CampaignDetailSerializer,
    CampaignItemDetailSerializer
)
from apps.tours.models import Tours
from apps.vendors.models import Vendors


class FlashSaleService:
    @classmethod
    def get_active_session(cls):
        """
        Lấy Phiên Flash Sale Giờ Vàng đang hoạt động hoặc phiên sắp diễn ra gần nhất
        phục vụ du khách săn vé trên Web End-user (/dashboard/trekking).
        """
        now = timezone.now()
        
        # 1. Tìm phiên đang chạy trực tiếp
        live_session = CampaignSessions.objects.filter(
            start_time__lte=now,
            end_time__gte=now,
            status__in=['active', 'upcoming']
        ).order_by('-start_time').first()

        if live_session:
            # Tự động cập nhật status sang active nếu đang là upcoming
            if live_session.status != 'active':
                live_session.status = 'active'
                live_session.save(update_fields=['status'])
            return {
                "has_session": True,
                "session_type": "live",
                "session": CampaignSessionDetailSerializer(live_session).data
            }

        # 2. Nếu không có phiên đang chạy, tìm phiên sắp diễn ra gần nhất
        upcoming_session = CampaignSessions.objects.filter(
            start_time__gt=now,
            status__in=['upcoming', 'draft']
        ).order_by('start_time').first()

        if upcoming_session:
            return {
                "has_session": True,
                "session_type": "upcoming",
                "session": CampaignSessionDetailSerializer(upcoming_session).data
            }

        # 3. Nếu không có phiên nào trong tương lai, lấy phiên gần nhất đã diễn ra
        latest_session = CampaignSessions.objects.order_by('-start_time').first()
        if latest_session:
            return {
                "has_session": True,
                "session_type": "ended",
                "session": CampaignSessionDetailSerializer(latest_session).data
            }

        return {
            "has_session": False,
            "session_type": "none",
            "session": None
        }

    @classmethod
    def get_admin_campaigns_overview(cls):
        """
        Lấy toàn bộ dữ liệu Chiến dịch & Phiên giờ vàng phục vụ Admin BQL (/admin/campaigns)
        kèm 4 thẻ chỉ số thống kê tổng quan (metrics).
        """
        now = timezone.now()
        campaigns_qs = Campaigns.objects.all().order_by('-created_at')
        sessions_qs = CampaignSessions.objects.all()
        items_qs = CampaignItems.objects.all()

        total_campaigns = campaigns_qs.count()
        active_sessions = sessions_qs.filter(start_time__lte=now, end_time__gte=now).count()
        total_slots = items_qs.aggregate(total=Sum('slot_quantity'))['total'] or 0
        total_sold = items_qs.aggregate(sold=Sum('sold_quantity'))['sold'] or 0
        
        avg_fill_rate = round((total_sold / total_slots) * 100) if total_slots > 0 else 0

        # Lấy danh sách tour chờ duyệt
        pending_items = items_qs.filter(status='pending_approval').select_related('tour', 'vendor', 'session')

        return {
            "metrics": {
                "total_campaigns": total_campaigns,
                "active_sessions": active_sessions,
                "total_slots": total_slots,
                "total_sold": total_sold,
                "avg_fill_rate": avg_fill_rate,
                "pending_items_count": pending_items.count()
            },
            "campaigns": CampaignDetailSerializer(campaigns_qs, many=True).data,
            "pending_items": CampaignItemDetailSerializer(pending_items, many=True).data
        }

    @classmethod
    def create_campaign(cls, data):
        """
        BQL khởi tạo Chiến dịch kích cầu mới (AD-03 / Campaigns)
        """
        title = data.get('title', '').strip()
        if not title:
            raise ValueError('Tiêu đề chiến dịch không được để trống.')

        deadline = data.get('registration_deadline') or (timezone.now() + timezone.timedelta(days=7))
        banner_url = data.get('banner_url') or 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'

        campaign = Campaigns.objects.create(
            title=title,
            description=data.get('description', ''),
            banner_url=banner_url,
            registration_deadline=deadline,
            max_items_per_vendor=int(data.get('max_items_per_vendor', 3)),
            status=data.get('status', 'active')
        )
        return CampaignDetailSerializer(campaign).data

    @classmethod
    def create_session(cls, data):
        """
        BQL thiết lập Phiên Giờ Vàng trong chiến dịch
        """
        campaign_id = data.get('campaign_id')
        campaign = Campaigns.objects.filter(id=campaign_id).first()
        if not campaign:
            campaign = Campaigns.objects.first()
            if not campaign:
                raise ValueError('Chưa có chiến dịch nào để tạo phiên.')

        session_name = data.get('session_name', '').strip() or f"Giờ Vàng {timezone.now().strftime('%d/%m')}"
        start_time = data.get('start_time') or timezone.now()
        end_time = data.get('end_time') or (timezone.now() + timezone.timedelta(hours=4))

        session = CampaignSessions.objects.create(
            campaign=campaign,
            session_name=session_name,
            start_time=start_time,
            end_time=end_time,
            auto_extend_enabled=bool(data.get('auto_extend_enabled', False)),
            max_extend_minutes=int(data.get('max_extend_minutes', 30)),
            dynamic_pricing_enabled=bool(data.get('dynamic_pricing_enabled', False)),
            status=data.get('status', 'active')
        )
        return CampaignSessionDetailSerializer(session).data

    @classmethod
    def register_tour_item(cls, data, vendor_user=None):
        """
        Đơn vị lữ hành (Vendor) hoặc BQL nộp tour tham gia vào phiên Flash Sale
        """
        session_id = data.get('session_id')
        session = CampaignSessions.objects.filter(id=session_id).first()
        if not session:
            session = CampaignSessions.objects.order_by('-created_at').first()
            if not session:
                raise ValueError('Không tìm thấy phiên Flash Sale phù hợp.')

        tour_id = data.get('tour_id')
        tour = Tours.objects.filter(id=tour_id).first()
        if not tour:
            raise ValueError('Không tìm thấy tour trải nghiệm yêu cầu.')

        vendor = tour.vendor
        if not vendor:
            vendor = Vendors.objects.first()

        promo_price = float(data.get('promo_price', 0))
        if promo_price <= 0:
            # Mặc định giảm 25% nếu chưa nhập
            promo_price = float(tour.price or 400000) * 0.75

        slot_quantity = int(data.get('slot_quantity', 10))

        # Kiểm tra item đã đăng ký chưa
        existing = CampaignItems.objects.filter(session=session, tour=tour).first()
        if existing:
            existing.promo_price = promo_price
            existing.slot_quantity = slot_quantity
            existing.status = 'approved'
            existing.save()
            return CampaignItemDetailSerializer(existing).data

        item = CampaignItems.objects.create(
            session=session,
            vendor=vendor,
            tour=tour,
            promo_price=promo_price,
            slot_quantity=slot_quantity,
            sold_quantity=0,
            status='approved'  # Tự động duyệt hoặc BQL duyệt
        )
        return CampaignItemDetailSerializer(item).data

    @classmethod
    def review_item(cls, item_id, action):
        """
        BQL duyệt hoặc từ chối tour tham gia Flash Sale
        """
        item = CampaignItems.objects.filter(id=item_id).first()
        if not item:
            raise ValueError('Không tìm thấy tour đăng ký.')

        if action == 'approve':
            item.status = 'approved'
        elif action == 'reject':
            item.status = 'rejected'
        item.save()

        return CampaignItemDetailSerializer(item).data

