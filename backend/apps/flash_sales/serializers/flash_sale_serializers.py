from rest_framework import serializers
from django.utils import timezone
from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.tours.models import Tours
from apps.vendors.models import Vendors


class CampaignItemDetailSerializer(serializers.ModelSerializer):
    tour_id = serializers.IntegerField(source='tour.id', read_only=True)
    tour_title = serializers.CharField(source='tour.title', read_only=True)
    tour_slug = serializers.CharField(source='tour.slug', read_only=True)
    tour_cover_image = serializers.CharField(source='tour.cover_image_url', read_only=True)
    tour_difficulty = serializers.CharField(source='tour.difficulty_level', read_only=True)
    tour_duration = serializers.IntegerField(source='tour.duration_hours', read_only=True)
    original_price = serializers.DecimalField(source='tour.price', max_digits=12, decimal_places=2, read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    vendor_id = serializers.IntegerField(source='vendor.id', read_only=True)
    discount_percent = serializers.SerializerMethodField()
    remaining_slots = serializers.SerializerMethodField()
    is_sold_out = serializers.SerializerMethodField()

    class Meta:
        model = CampaignItems
        fields = [
            'id', 'session_id', 'vendor_id', 'vendor_name', 'tour_id',
            'tour_title', 'tour_slug', 'tour_cover_image', 'tour_difficulty',
            'tour_duration', 'original_price', 'promo_price', 'discount_percent',
            'slot_quantity', 'sold_quantity', 'remaining_slots', 'is_sold_out',
            'status', 'created_at'
        ]

    def get_discount_percent(self, obj):
        if obj.tour and obj.tour.price and obj.tour.price > 0:
            orig = float(obj.tour.price)
            promo = float(obj.promo_price)
            if orig > promo:
                return round(((orig - promo) / orig) * 100)
        return 0

    def get_remaining_slots(self, obj):
        return max(0, obj.slot_quantity - obj.sold_quantity)

    def get_is_sold_out(self, obj):
        return obj.sold_quantity >= obj.slot_quantity


class CampaignSessionDetailSerializer(serializers.ModelSerializer):
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)
    items = serializers.SerializerMethodField()
    is_live = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_ended = serializers.SerializerMethodField()
    time_remaining_seconds = serializers.SerializerMethodField()
    countdown_text = serializers.SerializerMethodField()
    total_slots = serializers.SerializerMethodField()
    total_sold = serializers.SerializerMethodField()
    fill_rate_percent = serializers.SerializerMethodField()

    class Meta:
        model = CampaignSessions
        fields = [
            'id', 'campaign_id', 'campaign_title', 'session_name',
            'start_time', 'end_time', 'auto_extend_enabled', 'max_extend_minutes',
            'dynamic_pricing_enabled', 'status', 'is_live', 'is_upcoming',
            'is_ended', 'time_remaining_seconds', 'countdown_text',
            'total_slots', 'total_sold', 'fill_rate_percent', 'items'
        ]

    def get_items(self, obj):
        items = obj.campaignitems_set.filter(status='approved').select_related('tour', 'vendor')
        return CampaignItemDetailSerializer(items, many=True).data

    def get_is_live(self, obj):
        now = timezone.now()
        return obj.start_time <= now <= obj.end_time and obj.status != 'ended'

    def get_is_upcoming(self, obj):
        now = timezone.now()
        return now < obj.start_time

    def get_is_ended(self, obj):
        now = timezone.now()
        return now > obj.end_time or obj.status == 'ended'

    def get_time_remaining_seconds(self, obj):
        now = timezone.now()
        if obj.start_time <= now <= obj.end_time:
            return max(0, int((obj.end_time - now).total_seconds()))
        elif now < obj.start_time:
            return max(0, int((obj.start_time - now).total_seconds()))
        return 0

    def get_countdown_text(self, obj):
        sec = self.get_time_remaining_seconds(obj)
        hours = sec // 3600
        mins = (sec % 3600) // 60
        secs = sec % 60
        return f"{hours:02d}:{mins:02d}:{secs:02d}"

    def get_total_slots(self, obj):
        return sum(item.slot_quantity for item in obj.campaignitems_set.all())

    def get_total_sold(self, obj):
        return sum(item.sold_quantity for item in obj.campaignitems_set.all())

    def get_fill_rate_percent(self, obj):
        total = self.get_total_slots(obj)
        sold = self.get_total_sold(obj)
        if total > 0:
            return round((sold / total) * 100)
        return 0


class CampaignDetailSerializer(serializers.ModelSerializer):
    sessions = serializers.SerializerMethodField()
    total_sessions = serializers.SerializerMethodField()
    total_slots = serializers.SerializerMethodField()
    total_sold = serializers.SerializerMethodField()

    class Meta:
        model = Campaigns
        fields = [
            'id', 'title', 'description', 'banner_url',
            'registration_deadline', 'max_items_per_vendor', 'status',
            'total_sessions', 'total_slots', 'total_sold', 'sessions', 'created_at'
        ]

    def get_sessions(self, obj):
        sessions = obj.campaignsessions_set.all().order_by('-start_time')
        return CampaignSessionDetailSerializer(sessions, many=True).data

    def get_total_sessions(self, obj):
        return obj.campaignsessions_set.count()

    def get_total_slots(self, obj):
        return sum(
            item.slot_quantity 
            for s in obj.campaignsessions_set.all() 
            for item in s.campaignitems_set.all()
        )

    def get_total_sold(self, obj):
        return sum(
            item.sold_quantity 
            for s in obj.campaignsessions_set.all() 
            for item in s.campaignitems_set.all()
        )

