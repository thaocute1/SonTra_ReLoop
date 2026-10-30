from rest_framework import serializers
from ..models.tour_models import Tours, Routes, Checkpoints, TourSchedules
from apps.vendors.models.vendor_models import Vendors, Guides


class CheckpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkpoints
        fields = [
            'id', 'name', 'description', 'latitude', 'longitude',
            'radius_tolerance_m', 'order_index', 'is_mandatory', 'status'
        ]


class RouteSerializer(serializers.ModelSerializer):
    checkpoints = CheckpointSerializer(many=True, read_only=True)

    class Meta:
        model = Routes
        fields = [
            'id', 'start_latitude', 'start_longitude',
            'end_latitude', 'end_longitude', 'total_distance_km',
            'elevation_gain_m', 'gpx_file_url', 'checkpoints'
        ]


class TourScheduleSerializer(serializers.ModelSerializer):
    remaining_slots = serializers.ReadOnlyField()
    guide_name = serializers.SerializerMethodField()
    guide_phone = serializers.SerializerMethodField()
    formatted_date = serializers.SerializerMethodField()

    class Meta:
        model = TourSchedules
        fields = [
            'id', 'tour_id', 'departure_date', 'formatted_date',
            'start_time', 'end_time', 'max_capacity', 'booked_count',
            'remaining_slots', 'price', 'status', 'special_notes',
            'guide_name', 'guide_phone'
        ]

    def get_guide_name(self, obj):
        if getattr(obj, 'guide', None) and getattr(obj.guide, 'user', None):
            return obj.guide.user.name or obj.guide.user.email
        return 'Hướng Dẫn Viên Sơn Trà'

    def get_guide_phone(self, obj):
        if getattr(obj, 'guide', None) and getattr(obj.guide, 'user', None):
            return obj.guide.user.phone or ''
        return ''

    def get_formatted_date(self, obj):
        if obj.departure_date:
            return obj.departure_date.strftime('%d/%m/%Y')
        return ''


class TourListSerializer(serializers.ModelSerializer):
    price_formatted = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    next_departure = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = Tours
        fields = [
            'id', 'title', 'slug', 'price', 'price_formatted',
            'cover_image_url', 'images', 'difficulty_level',
            'duration_hours', 'avg_rating', 'total_reviews',
            'status', 'vendor_id', 'vendor_name',
            'next_departure', 'available_slots'
        ]

    def get_price_formatted(self, obj):
        return f"{int(obj.price):,} đ".replace(',', '.')

    def get_vendor_name(self, obj):
        if getattr(obj, 'vendor', None):
            return obj.vendor.brand_name
        return 'Sơn Trà Trekking'

    def get_next_departure(self, obj):
        return getattr(obj, '_next_departure', None)

    def get_available_slots(self, obj):
        return getattr(obj, '_available_slots', None)


class TourDetailSerializer(serializers.ModelSerializer):
    price_formatted = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_logo = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    checkpoints = serializers.SerializerMethodField()
    schedules = TourScheduleSerializer(many=True, read_only=True)
    esg_fund_percent = serializers.SerializerMethodField()

    class Meta:
        model = Tours
        fields = [
            'id', 'title', 'slug', 'description', 'price', 'price_formatted',
            'cover_image_url', 'images', 'max_capacity', 'difficulty_level',
            'duration_hours', 'cancellation_policy', 'avg_rating',
            'total_reviews', 'status', 'vendor_id', 'vendor_name', 'vendor_logo',
            'route', 'checkpoints', 'schedules', 'esg_fund_percent'
        ]

    def get_price_formatted(self, obj):
        return f"{int(obj.price):,} đ".replace(',', '.')

    def get_vendor_name(self, obj):
        if getattr(obj, 'vendor', None):
            return obj.vendor.brand_name
        return 'Sơn Trà Trekking'

    def get_vendor_logo(self, obj):
        if getattr(obj, 'vendor', None):
            return obj.vendor.logo_url
        return ''

    def get_route(self, obj):
        if hasattr(obj, 'routes'):
            r = obj.routes
            return {
                'start_latitude': str(r.start_latitude),
                'start_longitude': str(r.start_longitude),
                'end_latitude': str(r.end_latitude),
                'end_longitude': str(r.end_longitude),
                'total_distance_km': float(r.total_distance_km),
                'elevation_gain_m': r.elevation_gain_m
            }
        return None

    def get_checkpoints(self, obj):
        if hasattr(obj, 'routes'):
            cps = Checkpoints.objects.filter(route=obj.routes).order_by('order_index')
            return CheckpointSerializer(cps, many=True).data
        return []

    def get_esg_fund_percent(self, obj):
        return 10  # 10% tự động trích nộp Quỹ Bảo Tồn Bán Đảo Sơn Trà


class TourCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    cover_image_url = serializers.CharField(required=False, allow_blank=True)
    images = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    max_capacity = serializers.IntegerField(default=15)
    difficulty_level = serializers.ChoiceField(choices=['easy', 'moderate', 'challenging'], default='moderate')
    duration_hours = serializers.DecimalField(max_digits=4, decimal_places=2, default=4.0)

    # Lộ trình & Checkpoints
    total_distance_km = serializers.DecimalField(max_digits=5, decimal_places=2, default=4.0)
    elevation_gain_m = serializers.IntegerField(required=False, default=200)
    start_point = serializers.CharField(required=False, allow_blank=True)
    end_point = serializers.CharField(required=False, allow_blank=True)
    checkpoints = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    coordinates = serializers.ListField(required=False, default=list)
    vendor_id = serializers.IntegerField(required=False, allow_null=True)

    # Lịch khởi hành ban đầu
    initial_schedule = serializers.DictField(required=False, default=dict)


class TourScheduleCreateSerializer(serializers.Serializer):
    departure_date = serializers.DateField(input_formats=['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', 'iso-8601'])
    time_slot = serializers.CharField(required=False, allow_blank=True)
    start_time = serializers.TimeField(required=False, default='06:00:00')
    end_time = serializers.TimeField(required=False, default='10:30:00')
    max_capacity = serializers.IntegerField(default=15)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    guide_id = serializers.IntegerField(required=False, allow_null=True)
    special_notes = serializers.CharField(required=False, allow_blank=True)
    campaign_item_id = serializers.IntegerField(required=False, allow_null=True)


class TourBookingRequestSerializer(serializers.Serializer):
    tour_id = serializers.IntegerField(required=True)
    schedule_id = serializers.IntegerField(required=True)
    adults_count = serializers.IntegerField(min_value=1, default=1)
    children_count = serializers.IntegerField(min_value=0, default=0)
    customer_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(max_length=50)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    pickup_location = serializers.CharField(max_length=255, default='Trung tâm Đà Nẵng')
    payment_method = serializers.ChoiceField(
        choices=['payos'],
        default='payos'
    )
    special_notes = serializers.CharField(required=False, allow_blank=True)
    campaign_item_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_customer_phone(self, value):
        normalized = ''.join(character for character in value if character.isdigit() or character == '+')
        digit_count = sum(character.isdigit() for character in normalized)
        if digit_count < 9 or digit_count > 15:
            raise serializers.ValidationError('Số điện thoại phải có từ 9 đến 15 chữ số.')
        return value.strip()

