from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from apps.accounts.models.user_models import Users
from ..models.vendor_models import Vendors
from apps.tours.models.tour_models import Tours
from apps.orders.models.order_models import Orders, OrderVendors, OrderItems
from apps.payments.models.payment_models import LedgerEntries
from .vendor_finance import DEFAULT_REVENUE_PERIOD, vendor_finance
from decimal import Decimal
import secrets
import string


class VendorService:
    """
    Tầng xử lý nghiệp vụ đối tác lữ hành (Vendor Business Logic & Transactions)
    Toàn bộ dữ liệu được truy vấn và ghi nhận trực tiếp từ PostgreSQL Database
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

        with transaction.atomic():
            user = Users.objects.create(
                name=brand_name,
                email=email,
                phone=data.get('phone', ''),
                role='vendor_admin',
                status='unverified'
            )
            user.set_password(raw_password)
            user.save()

            vendor = Vendors.objects.create(
                user=user,
                brand_name=brand_name,
                tax_number=data.get('tax_number', ''),
                business_license_url=data.get('business_license_url', ''),
                contact_name=data.get('contact_name', brand_name),
                phone=data.get('phone', ''),
                status='pending_approval',
                commission_rate=Decimal('10.00'),
                profile_data={
                    'representative_title': data.get('representative_title', 'Giám đốc đại diện'),
                    'email': email,
                    'address': data.get('address', 'Đà Nẵng'),
                    'website': data.get('website', ''),
                    'description': data.get('description', ''),
                    'experience_years': data.get('experience_years', 1),
                    'insurance_certified': data.get('insurance_certified', False),
                    'leave_no_trace_pledge': data.get('leave_no_trace_pledge', True),
                    'id_card_front_url': data.get('id_card_front_url', ''),
                    'id_card_back_url': data.get('id_card_back_url', ''),
                    'bank_name': data.get('bank_name', ''),
                    'bank_account_number': data.get('bank_account_number', ''),
                    'bank_account_holder': data.get('bank_account_holder', '')
                }
            )

            vendor.initial_password = raw_password
            return vendor

    @classmethod
    def get_applications(cls, status=None, search=None):
        """
        Lấy danh sách hồ sơ đối tác phục vụ Admin kiểm duyệt (AD-01)
        """
        qs = Vendors.objects.select_related('user', 'verified_by_admin').all().order_by('-created_at')

        if status and status != 'all':
            qs = qs.filter(status=status)

        if search:
            qs = qs.filter(
                Q(brand_name__icontains=search) |
                Q(tax_number__icontains=search) |
                Q(phone__icontains=search) |
                Q(contact_name__icontains=search)
            )

        return qs

    @classmethod
    def get_application_detail(cls, vendor_id):
        return Vendors.objects.select_related('user', 'verified_by_admin').get(id=vendor_id)

    @classmethod
    def review_application(cls, vendor_id, new_status, reason=None, admin_user=None):
        """
        Phê duyệt hoặc từ chối hồ sơ đối tác
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
        all_vendors = Vendors.objects.all()
        return {
            'total': all_vendors.count(),
            'pending': all_vendors.filter(status='pending_approval').count(),
            'approved': all_vendors.filter(status='approved').count(),
            'need_info': all_vendors.filter(status='need_info').count(),
            'rejected': all_vendors.filter(status='rejected').count(),
        }

    @classmethod
    def get_vendor_dashboard(cls, vendor_id, period=DEFAULT_REVENUE_PERIOD):
        """
        Lấy thông tin tổng quan Vendor Dashboard từ CSDL PostgreSQL
        """
        vendor = Vendors.objects.get(id=vendor_id, deleted_at__isnull=True)
        totals, revenue_chart, reconciliation = vendor_finance(vendor.id, period)
        total_revenue = totals['total_gross_amount']
        monthly_revenue = totals['monthly_revenue']
        previous_month_revenue = totals['previous_month_revenue']
        monthly_growth = (
            float(round((monthly_revenue - previous_month_revenue) / previous_month_revenue * 100, 1))
            if previous_month_revenue else None
        )
        ov_qs = OrderVendors.objects.filter(vendor=vendor)
        booking_counts = {
            row['status']: row['count']
            for row in ov_qs.values('status').annotate(count=Count('id'))
        }
        monthly_bookings = ov_qs.filter(created_at__gte=timezone.localtime().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0,
        )).count()

        paid_tours = OrderItems.objects.filter(
            tour__vendor=vendor, order_vendor__vendor=vendor, order_vendor__order__payment_status='paid',
        ).exclude(order_vendor__status='cancelled').exclude(order_vendor__refund_status='refunded')
        tour_sales = {
            row['tour_id']: row for row in paid_tours.values('tour_id').annotate(
                bookings=Count('order_vendor', distinct=True),
                ticket_value=Sum(F('unit_price') * F('quantity')),
            )
        }
        experience_performance = []
        for tour in Tours.objects.filter(vendor=vendor, deleted_at__isnull=True).order_by('id'):
            sales = tour_sales.get(tour.id, {})
            ticket_value = sales.get('ticket_value', 0)
            experience_performance.append({
                'id': tour.id,
                'name': tour.title,
                'bookings_count': sales.get('bookings', 0),
                'revenue': int(ticket_value),
                'revenue_formatted': f"{int(ticket_value):,} đ".replace(',', '.'),
                'rating': float(tour.avg_rating),
                'status': tour.status,
                'status_label': {
                    'draft': 'Bản nháp', 'pending_approval': 'Chờ duyệt', 'need_info': 'Cần bổ sung',
                    'approved': 'Đã duyệt', 'rejected': 'Đã từ chối', 'published': 'Đang hoạt động',
                    'suspended': 'Tạm dừng', 'closed': 'Đã đóng',
                }.get(tour.status, tour.status),
            })

        # Đơn đặt gần nhất
        recent_list = []
        recent_orders = ov_qs.select_related('order__customer').prefetch_related(
            'orderitems_set__tour',
        ).order_by('-created_at', '-id')[:5]
        for ov in recent_orders:
            first_item = next(iter(ov.orderitems_set.all()), None)
            tour_title = first_item.tour.title if first_item and first_item.tour else '—'
            guests = first_item.quantity if first_item else 0
            recent_list.append({
                'id': ov.order.order_code,
                'tour_id': f"#{ov.order.order_code}",
                'customer_name': ov.order.customer.name if ov.order.customer else "Du khách",
                'experience_name': tour_title,
                'booking_date': ov.scheduled_date.strftime('%d/%m/%Y') if ov.scheduled_date else ov.created_at.strftime('%d/%m/%Y'),
                'guests_count': guests,
                'guests_label': f"{guests} khách",
                'total_price': int(ov.subtotal),
                'total_price_formatted': f"{int(ov.subtotal):,} đ".replace(',', '.'),
                'status': ov.status,
                'status_label': {
                    'waiting_payment': 'Chờ thanh toán', 'confirmed': 'Xác nhận',
                    'in_progress': 'Đang diễn ra', 'completed': 'Hoàn thành', 'cancelled': 'Đã hủy',
                }.get(ov.status, ov.status),
            })

        return {
            'vendor_info': {
                'id': vendor.id,
                'brand_name': vendor.brand_name,
                'status': 'verified' if vendor.status == 'approved' else vendor.status,
                'status_label': 'Đối tác đã xác minh' if vendor.status == 'approved' else 'Đối tác Sơn Trà',
                'avatar_text': ''.join(word[0] for word in vendor.brand_name.split()[:2]).upper(),
            },
            'metrics': {
                'total_revenue': int(total_revenue),
                'total_revenue_formatted': f"{int(total_revenue):,} đ".replace(',', '.'),
                'total_revenue_growth': None,
                'monthly_revenue': int(monthly_revenue),
                'monthly_revenue_formatted': f"{int(monthly_revenue):,} đ".replace(',', '.'),
                'monthly_revenue_growth': monthly_growth,
                'total_bookings': sum(booking_counts.values()),
                'monthly_bookings_diff': monthly_bookings,
                'avg_rating': float(vendor.avg_rating),
                'total_reviews': vendor.total_reviews,
            },
            'revenue_chart': revenue_chart,
            'reconciliation': reconciliation,
            'booking_overview': {
                name: booking_counts.get(name, 0)
                for name in ('confirmed', 'completed', 'cancelled')
            },
            'experience_performance': experience_performance,
            'recent_bookings': recent_list
        }

    @classmethod
    def get_vendor_bookings(cls, vendor_id=None, status=None, search=None, date=None):
        """
        Lấy danh sách các đơn đặt tour thực tế từ Database kèm bộ lọc
        """
        vendor = None
        if vendor_id:
            vendor = Vendors.objects.filter(id=vendor_id).first()
        if not vendor:
            vendor = Vendors.objects.filter(status='approved').first() or Vendors.objects.first()

        # Đồng bộ tự động các đơn PayOS đang chờ xử lý
        try:
            from apps.payments.views.payos_views import sync_pending_payos_transactions
            sync_pending_payos_transactions()
        except Exception:
            pass

        qs = OrderVendors.objects.select_related('order', 'order__customer', 'vendor').prefetch_related('orderitems_set__tour').order_by('-created_at')

        if vendor:
            qs = qs.filter(vendor=vendor)

        if status and status != 'all':
            qs = qs.filter(status=status)

        results = []
        status_map = {
            'confirmed': 'Đã xác nhận',
            'completed': 'Hoàn thành',
            'waiting_payment': 'Chờ xác nhận',
            'cancelled': 'Đã hủy'
        }

        for ov in qs:
            first_item = ov.orderitems_set.first()
            tour_title = first_item.tour.title if first_item and first_item.tour else "Tour Sinh Thái Sơn Trà"
            c_name = ov.order.shipping_address.get('customer_name') if isinstance(ov.order.shipping_address, dict) else (ov.order.customer.name if ov.order.customer else "Khách hàng")
            c_phone = ov.order.shipping_address.get('customer_phone') if isinstance(ov.order.shipping_address, dict) else (ov.order.customer.phone if ov.order.customer else "0905 123 456")
            pickup = ov.order.shipping_address.get('pickup_location') if isinstance(ov.order.shipping_address, dict) else "Đà Nẵng"
            notes = ov.order.shipping_address.get('special_notes') if isinstance(ov.order.shipping_address, dict) else ""

            qty = first_item.quantity if first_item else 2

            results.append({
                'id': str(ov.id),
                'order_code': ov.order.order_code,
                'is_flash_sale': bool(first_item and first_item.campaign_item_id),
                'campaign_item_id': first_item.campaign_item_id if first_item else None,
                'customer_name': c_name,
                'customer_phone': c_phone,
                'customer_email': ov.order.customer.email if ov.order.customer else "guest@sontra.vn",
                'pickup_location': pickup,
                'experience_name': tour_title,
                'booking_date': ov.scheduled_date.strftime('%d/%m/%Y') if ov.scheduled_date else ov.created_at.strftime('%d/%m/%Y'),
                'time_slot': '06:00 - 10:30',
                'adults_count': qty,
                'children_count': 0,
                'guests_label': f"{qty} người lớn",
                'total_price': int(ov.subtotal),
                'total_price_formatted': f"{int(ov.subtotal):,} đ".replace(',', '.'),
                'status': ov.status,
                'status_label': status_map.get(ov.status, 'Đã xác nhận'),
                'payment_status': ov.order.payment_status,
                'payment_status_label': 'Đã thanh toán' if ov.order.payment_status == 'paid' else 'Chưa thanh toán',
                'payment_method': 'Chuyển khoản QR',
                'special_notes': notes,
                'created_at': ov.created_at.strftime('%d/%m/%Y %H:%M')
            })

        if search:
            s = search.lower().strip()
            results = [
                b for b in results
                if s in b['order_code'].lower()
                or s in b['customer_name'].lower()
                or s in b['customer_phone'].lower()
                or s in b['experience_name'].lower()
            ]

        if date:
            results = [b for b in results if b['booking_date'] == date]

        stats = {
            'total': len(results),
            'waiting_confirmation': sum(1 for b in results if b['status'] in ['waiting_payment', 'waiting_confirmation']),
            'confirmed': sum(1 for b in results if b['status'] == 'confirmed'),
            'completed': sum(1 for b in results if b['status'] == 'completed'),
            'cancelled': sum(1 for b in results if b['status'] == 'cancelled'),
            'total_revenue': sum(b['total_price'] for b in results if b['status'] in ['confirmed', 'completed'])
        }

        return {
            'bookings': results,
            'stats': stats
        }

    @classmethod
    def create_vendor_booking(cls, data):
        """
        Vendor tạo đơn đặt hàng mới trực tiếp vào PostgreSQL
        """
        import random
        customer = Users.objects.filter(role='customer').first()
        vendor = Vendors.objects.first()
        tour = Tours.objects.first()

        order_code = f"ORD-{random.randint(1000, 9999)}"
        unit_price = Decimal(str(data.get('unit_price', tour.price if tour else 450000)))
        adults = int(data.get('adults_count', 1))
        total_price = unit_price * adults

        with transaction.atomic():
            order = Orders.objects.create(
                customer=customer,
                order_code=order_code,
                grand_total=total_price,
                payment_status='paid' if data.get('payment_status') == 'paid' else 'pending',
                shipping_address={
                    'customer_name': data.get('customer_name', 'Khách hàng mới'),
                    'customer_phone': data.get('customer_phone', ''),
                    'pickup_location': data.get('pickup_location', 'Đà Nẵng'),
                    'special_notes': data.get('special_notes', '')
                }
            )

            ov = OrderVendors.objects.create(
                order=order,
                vendor=vendor,
                subtotal=total_price,
                status=data.get('status', 'confirmed'),
                refund_status='none',
                refunded_amount=Decimal('0.00')
            )

            if tour:
                OrderItems.objects.create(
                    order_vendor=ov,
                    tour=tour,
                    item_type='tour',
                    quantity=adults,
                    unit_price=unit_price,
                    price_at_sale_time=unit_price
                )

            # Create ledger entry
            gross = total_price
            plat_fee = (gross * Decimal('0.08')).quantize(Decimal('0.01'))
            fund = (gross * Decimal('0.10')).quantize(Decimal('0.01'))
            net = gross - plat_fee - fund
            LedgerEntries.objects.create(
                order_vendor=ov,
                gross_amount=gross,
                platform_fee=plat_fee,
                conservation_fund=fund,
                vendor_net_amount=net,
                payout_status='recorded'
            )

            return {
                'id': str(ov.id),
                'order_code': order_code,
                'customer_name': data.get('customer_name', 'Khách hàng mới'),
                'customer_phone': data.get('customer_phone', ''),
                'customer_email': 'guest@sontra.vn',
                'pickup_location': data.get('pickup_location', 'Đà Nẵng'),
                'experience_name': tour.title if tour else 'Trekking Sơn Trà',
                'booking_date': timezone.now().strftime('%d/%m/%Y'),
                'time_slot': '06:00 - 10:30',
                'adults_count': adults,
                'children_count': 0,
                'guests_label': f"{adults} người lớn",
                'total_price': int(total_price),
                'total_price_formatted': f"{int(total_price):,} đ".replace(',', '.'),
                'status': ov.status,
                'status_label': 'Đã xác nhận' if ov.status == 'confirmed' else 'Chờ xác nhận',
                'payment_status': order.payment_status,
                'payment_status_label': 'Đã thanh toán' if order.payment_status == 'paid' else 'Chưa thanh toán',
                'payment_method': 'Tiền mặt tại quầy',
                'special_notes': data.get('special_notes', ''),
                'created_at': timezone.now().strftime('%d/%m/%Y %H:%M')
            }

    @classmethod
    def update_booking_status(cls, booking_id, new_status):
        """
        Cập nhật trạng thái đơn đặt trực tiếp trong PostgreSQL
        """
        ov = None
        if str(booking_id).isdigit():
            ov = OrderVendors.objects.filter(id=int(booking_id)).first()
        if not ov:
            ov = OrderVendors.objects.filter(order__order_code=str(booking_id)).first()

        if ov:
            ov.status = new_status
            ov.save(update_fields=['status'])
            return {
                'id': str(ov.id),
                'status': new_status,
                'status_label': 'Đã xác nhận' if new_status == 'confirmed' else ('Hoàn thành' if new_status == 'completed' else 'Đã hủy')
            }

        return None
