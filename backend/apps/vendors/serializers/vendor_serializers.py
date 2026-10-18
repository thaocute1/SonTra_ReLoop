from rest_framework import serializers
from apps.accounts.models.user_models import Users
from ..models.vendor_models import Vendors
import secrets
import string


class VendorRegisterSerializer(serializers.Serializer):
    """
    Serializer xác thực thông tin đối tác nộp hồ sơ từ Cổng Đối tác (/partner/onboarding)
    """
    brand_name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    vendor_type = serializers.CharField(max_length=50, default='tour_operator')
    service_type = serializers.CharField(max_length=100, required=False, allow_blank=True, default='Trekking')
    operating_area = serializers.CharField(max_length=150, required=False, allow_blank=True, default='Bán đảo Sơn Trà')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField()
    website = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    business_license_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(max_length=128, required=False, allow_blank=True)
    
    # Cam kết du lịch bền vững & Quỹ bảo tồn ESG
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=4, default=0.1000)
    safety_commitment = serializers.BooleanField(default=True)
    esg_fund_commitment = serializers.BooleanField(default=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if Users.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("Email này đã được đăng ký tài khoản trên hệ thống.")
        return normalized

    def validate_phone(self, value):
        if value:
            phone_clean = value.strip()
            if Users.objects.filter(phone=phone_clean).exists():
                raise serializers.ValidationError("Số điện thoại này đã được sử dụng.")
            return phone_clean
        return value

    def validate_brand_name(self, value):
        name_clean = value.strip()
        if Vendors.objects.filter(brand_name__iexact=name_clean).exists():
            raise serializers.ValidationError("Tên thương hiệu doanh nghiệp này đã tồn tại.")
        return name_clean


class VendorApplicationListSerializer(serializers.ModelSerializer):
    """
    Serializer danh sách hồ sơ đối tác phục vụ màn hình Admin Kiểm duyệt
    """
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_status = serializers.CharField(source='user.status', read_only=True)
    verified_by_admin_name = serializers.CharField(source='verified_by_admin.name', read_only=True, default=None)

    class Meta:
        model = Vendors
        fields = [
            'id',
            'user_id',
            'brand_name',
            'vendor_type',
            'logo_url',
            'business_license_code',
            'phone',
            'email',
            'commission_rate',
            'status',
            'rejection_reason',
            'user_status',
            'verified_by_admin_name',
            'verified_at',
            'created_at',
            'updated_at'
        ]


class VendorApplicationDetailSerializer(serializers.ModelSerializer):
    """
    Serializer chi tiết hồ sơ đối tác kèm tài khoản và thông tin pháp nhân đầy đủ
    """
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_status = serializers.CharField(source='user.status', read_only=True)
    verified_by_admin_name = serializers.CharField(source='verified_by_admin.name', read_only=True, default=None)
    initial_password = serializers.CharField(read_only=True, default=None)

    class Meta:
        model = Vendors
        fields = [
            'id',
            'user_id',
            'user_name',
            'user_email',
            'user_status',
            'brand_name',
            'vendor_type',
            'logo_url',
            'business_license_code',
            'phone',
            'email',
            'commission_rate',
            'avg_rating',
            'total_reviews',
            'status',
            'rejection_reason',
            'initial_password',
            'verified_by_admin_name',
            'verified_at',
            'created_at',
            'updated_at'
        ]


class VendorReviewActionSerializer(serializers.Serializer):
    """
    Serializer thẩm định của Admin: duyệt, từ chối hoặc yêu cầu bổ sung
    """
    status = serializers.ChoiceField(choices=['approved', 'need_info', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        status_val = attrs.get('status')
        reason = attrs.get('rejection_reason', '').strip()
        
        if status_val in ['need_info', 'rejected'] and not reason:
            raise serializers.ValidationError({
                "rejection_reason": "Vui lòng nhập lý do cụ thể khi từ chối hoặc yêu cầu bổ sung hồ sơ."
            })
        return attrs

