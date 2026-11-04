from rest_framework import serializers
from apps.orders.models.order_models import Vouchers, UserVouchers
from apps.gamification.models.gamification_models import PointsLedger

class VoucherRewardSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    discount_badge = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    pickup_location = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    tag = serializers.SerializerMethodField()
    valid_days = serializers.SerializerMethodField()

    class Meta:
        model = Vouchers
        fields = [
            'id',
            'code',
            'title',
            'discount_amount',
            'discount_percent',
            'points_required',
            'effective_from',
            'effective_to',
            'is_active',
            'vendor_name',
            'type',
            'discount_badge',
            'image',
            'pickup_location',
            'description',
            'tag',
            'valid_days'
        ]

    def get_vendor_name(self, obj):
        if obj.vendor and hasattr(obj.vendor, 'brand_name'):
            return obj.vendor.brand_name
        return "Ban Quản Lý Bán Đảo Sơn Trà"

    def get_type(self, obj):
        if obj.code.startswith('GIFT-') or (not obj.discount_percent and not obj.discount_amount):
            return "gift"
        return "voucher"

    def get_discount_badge(self, obj):
        if obj.discount_percent:
            return f"GIẢM {obj.discount_percent}%"
        if obj.discount_amount and obj.discount_amount > 0:
            return f"-{int(obj.discount_amount):,}đ".replace(',', '.')
        return "QUÀ TẶNG"

    def get_image(self, obj):
        # Curated high quality imagery based on Son Tra landmarks
        title_lower = (obj.title or "").lower()
        if "san hô" in title_lower or "bãi nam" in title_lower:
            return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80"
        if "cây đa" in title_lower or "rừng già" in title_lower:
            return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80"
        if "đỉnh bàn cờ" in title_lower:
            return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
        if "chèo sup" in title_lower or "bãi rạng" in title_lower:
            return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
        if "bình giữ nhiệt" in title_lower:
            return "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80"
        if "túi canvas" in title_lower or "túi vải" in title_lower:
            return "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=600&q=80"
        if "voọc" in title_lower or "móc khóa" in title_lower:
            return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
        if "sổ tay" in title_lower:
            return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
        return "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80"

    def get_pickup_location(self, obj):
        title_lower = (obj.title or "").lower()
        if "bình giữ nhiệt" in title_lower:
            return "Văn phòng BQL Bán đảo Sơn Trà (Khu vực Bãi Bụt)"
        if "túi canvas" in title_lower:
            return "Trạm Kiểm lâm Cây Đa hoặc Quầy Lễ Tân BQL"
        if "móc khóa" in title_lower:
            return "Trạm Đón Tiếp BQL Bán Đảo Sơn Trà"
        if "sổ tay" in title_lower:
            return "Trạm Hướng Dẫn Du Khách Bán Đảo Sơn Trà"
        return None

    def get_description(self, obj):
        title_lower = (obj.title or "").lower()
        if "san hô" in title_lower:
            return "Áp dụng cho tour lặn ngắm san hô bảo tồn tại Bãi Nam Sơn Trà. Không áp dụng cùng CTKM khác."
        if "cây đa" in title_lower:
            return "Áp dụng cho mọi lượt đặt tour trekking khám phá Cây Đa Ngàn Năm có hướng dẫn viên bản địa."
        if "đỉnh bàn cờ" in title_lower:
            return "Giảm trực tiếp khi đặt tour trekking chinh phục Đỉnh Bàn Cờ ngắm toàn cảnh thành phố Đà Nẵng."
        if "chèo sup" in title_lower:
            return "Trải nghiệm chèo SUP không động cơ, thân thiện với hệ sinh thái biển Bãi Rạng lúc hoàng hôn."
        if "bình giữ nhiệt" in title_lower:
            return "Inox 304 cao cấp 2 lớp giữ nhiệt 12h, in logo ReLoop Sơn Trà. Loại bỏ chai nhựa 1 lần khi đi trekking."
        if "túi canvas" in title_lower:
            return "Dệt từ 100% sợi cotton tái chế và rác nhựa biển thu gom tại Sơn Trà. Tiện dụng khi dọn rác trekking."
        if "móc khóa" in title_lower:
            return "Chế tác thủ công từ gỗ tái sinh bởi nghệ nhân bản địa mô phỏng loài Voọc chà vá chân nâu quý hiếm."
        if "sổ tay" in title_lower:
            return "Giấy tái chế 100 trang kèm bìa ép bã mía dập nổi, tặng kèm bút bi tre dã ngoại."
        return obj.title

    def get_tag(self, obj):
        if self.get_type(obj) == "gift":
            return "Quà Nhận Tại Trạm"
        return "Voucher Tour"

    def get_valid_days(self, obj):
        if obj.effective_to and obj.effective_from:
            delta = (obj.effective_to - obj.effective_from).days
            return max(1, delta)
        return 45


class RedeemRewardRequestSerializer(serializers.Serializer):
    voucher_id = serializers.IntegerField(required=True)


class UserVoucherSerializer(serializers.ModelSerializer):
    voucher_id = serializers.IntegerField(source='voucher.id', read_only=True)
    title = serializers.CharField(source='voucher.title', read_only=True)
    code = serializers.CharField(source='voucher.code', read_only=True)
    points_spent = serializers.IntegerField(source='voucher.points_required', read_only=True)
    discount_percent = serializers.IntegerField(source='voucher.discount_percent', read_only=True)
    discount_amount = serializers.DecimalField(source='voucher.discount_amount', max_digits=12, decimal_places=2, read_only=True)
    vendor_name = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    discount_badge = serializers.SerializerMethodField()
    pickup_location = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    acquired_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    expires_at = serializers.SerializerMethodField()

    class Meta:
        model = UserVouchers
        fields = [
            'id',
            'voucher_id',
            'code',
            'title',
            'status',
            'acquired_at',
            'expires_at',
            'points_spent',
            'discount_percent',
            'discount_amount',
            'vendor_name',
            'type',
            'discount_badge',
            'pickup_location',
            'image'
        ]

    def get_vendor_name(self, obj):
        if obj.voucher.vendor and hasattr(obj.voucher.vendor, 'brand_name'):
            return obj.voucher.vendor.brand_name
        return "Ban Quản Lý Bán Đảo Sơn Trà"

    def get_type(self, obj):
        v = obj.voucher
        if v.code.startswith('GIFT-') or (not v.discount_percent and not v.discount_amount):
            return "gift"
        return "voucher"

    def get_discount_badge(self, obj):
        v = obj.voucher
        if v.discount_percent:
            return f"GIẢM {v.discount_percent}%"
        if v.discount_amount and v.discount_amount > 0:
            return f"-{int(v.discount_amount):,}đ".replace(',', '.')
        return "QUÀ TẶNG"

    def get_pickup_location(self, obj):
        title_lower = (obj.voucher.title or "").lower()
        if "bình giữ nhiệt" in title_lower:
            return "Văn phòng BQL Bán đảo Sơn Trà (Khu vực Bãi Bụt)"
        if "túi canvas" in title_lower:
            return "Trạm Kiểm lâm Cây Đa hoặc Quầy Lễ Tân BQL"
        if "móc khóa" in title_lower:
            return "Trạm Đón Tiếp BQL Bán Đảo Sơn Trà"
        if "sổ tay" in title_lower:
            return "Trạm Hướng Dẫn Du Khách Bán Đảo Sơn Trà"
        return None

    def get_image(self, obj):
        title_lower = (obj.voucher.title or "").lower()
        if "san hô" in title_lower or "bãi nam" in title_lower:
            return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80"
        if "cây đa" in title_lower:
            return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80"
        if "đỉnh bàn cờ" in title_lower:
            return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
        if "chèo sup" in title_lower or "bãi rạng" in title_lower:
            return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
        if "bình giữ nhiệt" in title_lower:
            return "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80"
        if "túi canvas" in title_lower:
            return "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=600&q=80"
        if "móc khóa" in title_lower:
            return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
        if "sổ tay" in title_lower:
            return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
        return "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80"

    def get_expires_at(self, obj):
        if obj.voucher.effective_to:
            return obj.voucher.effective_to.strftime("%d/%m/%Y")
        return "Không thời hạn"


class PointsLedgerSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    type = serializers.SerializerMethodField()

    class Meta:
        model = PointsLedger
        fields = [
            'id',
            'points_change',
            'reason',
            'reference_type',
            'created_at',
            'type'
        ]

    def get_type(self, obj):
        return "earn" if obj.points_change >= 0 else "spend"

