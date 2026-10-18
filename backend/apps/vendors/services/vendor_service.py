from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from apps.accounts.models.user_models import Users
from ..models.vendor_models import Vendors
import secrets
import string


class VendorService:
    """
    Tầng xử lý nghiệp vụ đối tác lữ hành (Vendor Business Logic & Transactions)
    """

    @staticmethod
    def _generate_default_password():
        """Tạo mật khẩu khởi tạo ngẫu nhiên an toàn nếu đối tác chưa nhập"""
        chars = string.ascii_letters + string.digits + '!@#$%'
        return 'Vnd#' + ''.join(secrets.choice(chars) for _ in range(8))

    @classmethod
    def register_vendor(cls, data):
        """
        Giao dịch nguyên tử đăng ký đối tác mới:
        1. Tạo tài khoản người dùng Users (role: vendor_admin, status: unverified)
        2. Tạo hồ sơ đối tác Vendors (status: pending_approval, commission_rate: 10%)
        """
        raw_password = data.get('password') or cls._generate_default_password()
        brand_name = data.get('brand_name')
        email = data.get('email')
        phone = data.get('phone') or None

        with transaction.atomic():
            # 1. Tạo bản ghi Users
            user = Users(
                name=brand_name,
                email=email,
                phone=phone,
                role='vendor_admin',
                status='unverified',  # Chờ BQL phê duyệt mới kích hoạt active
            )
            user.set_password(raw_password)
            user.save()

            # 2. Tạo bản ghi Vendors
            vendor = Vendors(
                user=user,
                brand_name=brand_name,
                vendor_type=data.get('vendor_type', 'tour_operator'),
                business_license_code=data.get('business_license_code', ''),
                phone=phone or '',
                email=email,
                logo_url=data.get('logo_url', ''),
                commission_rate=data.get('commission_rate', 0.1000),
                status='pending_approval',
            )
            vendor.save()

            return vendor

    @classmethod
    def get_applications(cls, status=None, search=None):
        """
        Lấy danh sách hồ sơ đối tác kèm bộ lọc trạng thái và tìm kiếm
        """
        queryset = Vendors.objects.all().select_related('user', 'verified_by_admin').order_by('-created_at')

        if status and status != 'all':
            queryset = queryset.filter(status=status)

        if search and search.strip():
            q = search.strip()
            queryset = queryset.filter(
                Q(brand_name__icontains=q) |
                Q(business_license_code__icontains=q) |
                Q(email__icontains=q) |
                Q(phone__icontains=q)
            )

        return queryset

    @classmethod
    def get_application_by_id(cls, vendor_id):
        """
        Lấy chi tiết một hồ sơ đối tác
        """
        try:
            return Vendors.objects.select_related('user', 'verified_by_admin').get(id=vendor_id)
        except Vendors.DoesNotExist:
            return None

    @classmethod
    def review_application(cls, vendor_id, new_status, reason='', admin_user=None):
        """
        Thẩm định hồ sơ đối tác:
        - approved: Cập nhật status, kích hoạt user.status = 'active'
        - need_info / rejected: Cập nhật status, lưu rejection_reason
        """
        with transaction.atomic():
            vendor = Vendors.objects.select_related('user').get(id=vendor_id)
            vendor.status = new_status
            vendor.verified_at = timezone.now()

            if admin_user and hasattr(admin_user, 'is_authenticated') and admin_user.is_authenticated:
                if isinstance(admin_user, Users):
                    vendor.verified_by_admin = admin_user

            initial_password = None
            if new_status == 'approved':
                # Cấp mật khẩu khởi tạo mặc định Vendor@2026 và kích hoạt tài khoản
                initial_password = "Vendor@2026"
                if vendor.user:
                    vendor.user.set_password(initial_password)
                    vendor.user.status = 'active'
                    vendor.user.save()
                vendor.rejection_reason = ''
            else:
                vendor.rejection_reason = reason or ''

            vendor.save()
            vendor.initial_password = initial_password
            return vendor

    @classmethod
    def get_stats(cls):
        """
        Thống kê số lượng hồ sơ theo từng trạng thái
        """
        all_vendors = Vendors.objects.all()
        return {
            'total': all_vendors.count(),
            'pending': all_vendors.filter(status='pending_approval').count(),
            'approved': all_vendors.filter(status='approved').count(),
            'need_info': all_vendors.filter(status='need_info').count(),
            'rejected': all_vendors.filter(status='rejected').count(),
        }

    @classmethod
    def get_vendor_dashboard(cls, vendor_id=None):
        """
        Lấy thông tin tổng quan, số liệu KPI, biểu đồ và đơn hàng cho Vendor Dashboard
        Khớp chuẩn 100% với giao diện Figma yêu cầu
        """
        vendor = None
        if vendor_id:
            vendor = Vendors.objects.filter(id=vendor_id).first()
        if not vendor:
            vendor = Vendors.objects.filter(status='approved').first() or Vendors.objects.first()

        brand_name = vendor.brand_name if vendor else "Sơn Trà Trekking"

        return {
            'vendor_info': {
                'id': vendor.id if vendor else 1,
                'brand_name': brand_name,
                'status': 'verified',
                'status_label': 'Đối tác đã xác minh',
                'avatar_text': 'ST'
            },
            'metrics': {
                'total_revenue': 18500000,
                'total_revenue_formatted': '18.500.000 đ',
                'total_revenue_growth': 12.5,
                'monthly_revenue': 7250000,
                'monthly_revenue_formatted': '7.250.000 đ',
                'monthly_revenue_growth': 8.2,
                'total_bookings': 128,
                'monthly_bookings_diff': 18,
                'avg_rating': 4.8,
                'total_reviews': 112
            },
            'revenue_chart': {
                'active_period': '3 tháng',
                'data': [
                    {'month': 'Th06', 'label': 'Th06 · 4.2M', 'revenue': 4200000, 'formatted': '4.2M'},
                    {'month': 'Th07', 'label': 'Th07 · 5.8M', 'revenue': 5800000, 'formatted': '5.8M'},
                    {'month': 'Th08', 'label': 'Th08 · 6.4M', 'revenue': 6400000, 'formatted': '6.4M'},
                    {'month': 'Th09', 'label': 'Th09 · 7.25M', 'revenue': 7250000, 'formatted': '7.25M'}
                ]
            },
            'booking_overview': {
                'confirmed': 42,
                'completed': 112,
                'cancelled': 8
            },
            'experience_performance': [
                {
                    'id': 1,
                    'name': 'Bãi Bắc - Cây Đa',
                    'bookings_count': 48,
                    'revenue': 8200000,
                    'revenue_formatted': '8.200.000 đ',
                    'rating': 4.9,
                    'status': 'active',
                    'status_label': 'Đang hoạt động'
                },
                {
                    'id': 2,
                    'name': 'Đỉnh Bàn Cờ',
                    'bookings_count': 35,
                    'revenue': 5100000,
                    'revenue_formatted': '5.100.000 đ',
                    'rating': 4.8,
                    'status': 'active',
                    'status_label': 'Đang hoạt động'
                },
                {
                    'id': 3,
                    'name': 'Ghềnh Bàng',
                    'bookings_count': 25,
                    'revenue': 3400000,
                    'revenue_formatted': '3.400.000 đ',
                    'rating': 4.7,
                    'status': 'active',
                    'status_label': 'Đang hoạt động'
                }
            ],
            'recent_bookings': [
                {
                    'id': 'BK1024',
                    'tour_id': '#BK1024',
                    'customer_name': 'Nguyễn Minh',
                    'experience_name': 'Bãi Bắc - Cây Đa',
                    'booking_date': '18/09/2026',
                    'guests_count': 2,
                    'guests_label': '2 guests',
                    'total_price': 450000,
                    'total_price_formatted': '450.000 đ',
                    'status': 'confirmed',
                    'status_label': 'Xác nhận'
                }
            ]
        }

    # Bộ nhớ demo đơn đặt cho Vendor (In-memory mock store)
    _mock_bookings = [
        {
            'id': 'BK1024',
            'order_code': 'BK1024',
            'customer_name': 'Nguyễn Minh',
            'customer_phone': '0905 123 456',
            'customer_email': 'minh.nguyen@gmail.com',
            'pickup_location': 'Khách sạn A La Carte, Võ Nguyên Giáp, Đà Nẵng',
            'experience_name': 'Bãi Bắc - Cây Đa ngàn năm',
            'booking_date': '18/09/2026',
            'time_slot': '06:00 - 10:30',
            'adults_count': 2,
            'children_count': 0,
            'guests_label': '2 người lớn',
            'total_price': 900000,
            'total_price_formatted': '900.000 đ',
            'status': 'confirmed',
            'status_label': 'Đã xác nhận',
            'payment_status': 'paid',
            'payment_status_label': 'Đã thanh toán',
            'payment_method': 'Chuyển khoản QR',
            'special_notes': 'Chuẩn bị thêm gậy trekking cỡ vừa',
            'created_at': '18/09/2026 08:30'
        },
        {
            'id': 'BK1023',
            'order_code': 'BK1023',
            'customer_name': 'Lê Hoàng Nam',
            'customer_phone': '0912 345 678',
            'customer_email': 'nam.le@company.vn',
            'pickup_location': 'Cầu Rồng, Hải Châu, Đà Nẵng',
            'experience_name': 'Đỉnh Bàn Cờ - Ngắm Hoàng Hôn',
            'booking_date': '17/09/2026',
            'time_slot': '14:30 - 18:30',
            'adults_count': 3,
            'children_count': 1,
            'guests_label': '3 người lớn, 1 trẻ em',
            'total_price': 1500000,
            'total_price_formatted': '1.500.000 đ',
            'status': 'completed',
            'status_label': 'Hoàn thành',
            'payment_status': 'paid',
            'payment_status_label': 'Đã thanh toán',
            'payment_method': 'Tiền mặt tại quầy',
            'special_notes': 'Có 1 trẻ em 10 tuổi, đi cùng bố mẹ',
            'created_at': '16/09/2026 14:15'
        },
        {
            'id': 'BK1022',
            'order_code': 'BK1022',
            'customer_name': 'Trần Thu Thảo',
            'customer_phone': '0988 776 655',
            'customer_email': 'thuthao.tran@gmail.com',
            'pickup_location': 'Resort InterContinental Đà Nẵng',
            'experience_name': 'Chinh phục Mũi Nghê - Bình Minh Sớm',
            'booking_date': '19/09/2026',
            'time_slot': '05:00 - 09:30',
            'adults_count': 2,
            'children_count': 0,
            'guests_label': '2 người lớn',
            'total_price': 800000,
            'total_price_formatted': '800.000 đ',
            'status': 'waiting_confirmation',
            'status_label': 'Chờ xác nhận',
            'payment_status': 'deposit',
            'payment_status_label': 'Đã cọc 50%',
            'payment_method': 'Chuyển khoản QR',
            'special_notes': 'Khách muốn hỗ trợ chụp ảnh hoàng hôn/bình minh',
            'created_at': '18/09/2026 19:45'
        },
        {
            'id': 'BK1021',
            'order_code': 'BK1021',
            'customer_name': 'Võ Quốc Huy',
            'customer_phone': '0935 998 811',
            'customer_email': 'huy.vo@outlook.com',
            'pickup_location': 'Bến xe trung tâm Đà Nẵng',
            'experience_name': 'Khám phá Rừng Cây Đa ngàn năm',
            'booking_date': '20/09/2026',
            'time_slot': '07:30 - 11:30',
            'adults_count': 4,
            'children_count': 0,
            'guests_label': '4 người lớn',
            'total_price': 1600000,
            'total_price_formatted': '1.600.000 đ',
            'status': 'waiting_confirmation',
            'status_label': 'Chờ xác nhận',
            'payment_status': 'unpaid',
            'payment_status_label': 'Chờ thanh toán',
            'payment_method': 'Tiền mặt khi đón',
            'special_notes': 'Nhóm bạn thân leo núi lần đầu, cần hướng dẫn viên kèm',
            'created_at': '18/09/2026 21:10'
        },
        {
            'id': 'BK1020',
            'order_code': 'BK1020',
            'customer_name': 'Đặng Mai Lan',
            'customer_phone': '0903 555 123',
            'customer_email': 'lan.dang@yahoo.com',
            'pickup_location': 'Số 12 Bạch Đằng, Hải Châu, Đà Nẵng',
            'experience_name': 'Ghềnh Bàng - Lặn biển ngắm san hô',
            'booking_date': '15/09/2026',
            'time_slot': '08:00 - 12:00',
            'adults_count': 2,
            'children_count': 0,
            'guests_label': '2 người lớn',
            'total_price': 700000,
            'total_price_formatted': '700.000 đ',
            'status': 'cancelled',
            'status_label': 'Đã hủy',
            'payment_status': 'unpaid',
            'payment_status_label': 'Chưa thanh toán',
            'payment_method': 'Tiền mặt',
            'special_notes': 'Thời tiết mưa bão, đối tác và khách đã thống nhất dời chuyến',
            'created_at': '14/09/2026 10:00'
        }
    ]

    @classmethod
    def get_vendor_bookings(cls, vendor_id=None, status=None, search=None, date=None):
        """
        Lấy danh sách các đơn đặt tour của Vendor kèm bộ lọc thông minh
        """
        results = list(cls._mock_bookings)

        if status and status != 'all':
            results = [b for b in results if b.get('status') == status]

        if search:
            search_lower = search.lower().strip()
            results = [
                b for b in results
                if search_lower in b.get('order_code', '').lower()
                or search_lower in b.get('customer_name', '').lower()
                or search_lower in b.get('customer_phone', '').lower()
                or search_lower in b.get('experience_name', '').lower()
            ]

        if date:
            results = [b for b in results if b.get('booking_date') == date]

        # Thống kê nhanh theo trạng thái
        stats = {
            'total': len(cls._mock_bookings),
            'waiting_confirmation': sum(1 for b in cls._mock_bookings if b.get('status') == 'waiting_confirmation'),
            'confirmed': sum(1 for b in cls._mock_bookings if b.get('status') == 'confirmed'),
            'completed': sum(1 for b in cls._mock_bookings if b.get('status') == 'completed'),
            'cancelled': sum(1 for b in cls._mock_bookings if b.get('status') == 'cancelled'),
            'total_revenue': sum(b.get('total_price', 0) for b in cls._mock_bookings if b.get('status') in ['confirmed', 'completed'])
        }

        return {
            'bookings': results,
            'stats': stats
        }

    @classmethod
    def create_vendor_booking(cls, data):
        """
        Vendor tạo đơn đặt hàng mới trực tiếp (cho khách gọi điện, nhắn tin hoặc tại quầy)
        """
        import random
        new_id_number = random.randint(1025, 9999)
        order_code = f"BK{new_id_number}"

        adults = int(data.get('adults_count', 1))
        children = int(data.get('children_count', 0))
        unit_price = int(data.get('unit_price', 450000))
        total_price = adults * unit_price + int(children * unit_price * 0.7)

        status_map = {
            'waiting_confirmation': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'completed': 'Hoàn thành'
        }
        payment_map = {
            'paid': 'Đã thanh toán',
            'deposit': 'Đã cọc 50%',
            'unpaid': 'Chưa thanh toán'
        }

        new_booking = {
            'id': order_code,
            'order_code': order_code,
            'customer_name': data.get('customer_name', 'Khách hàng mới'),
            'customer_phone': data.get('customer_phone', ''),
            'customer_email': data.get('customer_email', ''),
            'pickup_location': data.get('pickup_location', 'Đà Nẵng'),
            'experience_name': data.get('experience_name', 'Trekking Sơn Trà'),
            'booking_date': data.get('booking_date', timezone.now().strftime('%d/%m/%Y')),
            'time_slot': data.get('time_slot', '06:00 - 10:30'),
            'adults_count': adults,
            'children_count': children,
            'guests_label': f"{adults} người lớn{f', {children} trẻ em' if children > 0 else ''}",
            'total_price': total_price,
            'total_price_formatted': f"{total_price:,} đ".replace(',', '.'),
            'status': data.get('status', 'confirmed'),
            'status_label': status_map.get(data.get('status', 'confirmed'), 'Đã xác nhận'),
            'payment_status': data.get('payment_status', 'paid'),
            'payment_status_label': payment_map.get(data.get('payment_status', 'paid'), 'Đã thanh toán'),
            'payment_method': data.get('payment_method', 'Tiền mặt tại quầy'),
            'special_notes': data.get('special_notes', ''),
            'created_at': timezone.now().strftime('%d/%m/%Y %H:%M')
        }

        cls._mock_bookings.insert(0, new_booking)
        return new_booking

    @classmethod
    def update_booking_status(cls, booking_id, new_status):
        """
        Cập nhật trạng thái đơn đặt (Xác nhận, Hoàn thành, Hủy)
        """
        status_map = {
            'waiting_confirmation': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        }

        for b in cls._mock_bookings:
            if b['id'] == booking_id or b['order_code'] == booking_id:
                b['status'] = new_status
                b['status_label'] = status_map.get(new_status, new_status)
                if new_status == 'completed':
                    b['payment_status'] = 'paid'
                    b['payment_status_label'] = 'Đã thanh toán'
                return b

        return None


