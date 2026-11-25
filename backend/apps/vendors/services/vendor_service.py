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
                phone=data.get('phone') or None,
                role='vendor_admin',
                status='unverified'
            )
            user.set_password(raw_password)
            user.save()

            vendor = Vendors.objects.create(
                user=user,
                vendor_type=data.get('vendor_type', 'tour_operator'),
                brand_name=brand_name,
                logo_url=data.get('logo_url') or '',
                business_license_code=data.get('business_license_code') or data.get('tax_number') or '',
                phone=data.get('phone') or '',
                email=email,
                status='pending_approval',
                commission_rate=Decimal('0.1000'),
            )

            return vendor

    @classmethod
    def get_applications(cls, status=None, search=None):
        """
        Lấy danh sách hồ sơ đối tác phục vụ Admin kiểm duyệt (AD-01)
        """
        qs = Vendors.objects.select_related('user', 'verified_by_admin').filter(
            deleted_at__isnull=True
        ).order_by('-created_at')

        if status and status != 'all':
            qs = qs.filter(status=status)

        if search:
            qs = qs.filter(
                Q(brand_name__icontains=search) |
                Q(business_license_code__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search) |
                Q(user__name__icontains=search)
            )

        return qs

    @classmethod
    def get_application_detail(cls, vendor_id):
        return Vendors.objects.select_related('user', 'verified_by_admin').filter(
            id=vendor_id, deleted_at__isnull=True
        ).first()

    @classmethod
    def get_application_by_id(cls, vendor_id):
        return cls.get_application_detail(vendor_id)

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

            if new_status == 'approved':
                if vendor.user:
                    update_fields = ['status']
                    if not vendor.user.password_hash:
                        vendor.user.set_password(cls._generate_default_password())
                        update_fields.append('password_hash')
                    vendor.user.status = 'active'
                    vendor.user.save(update_fields=update_fields)
                vendor.rejection_reason = ''
            else:
                vendor.rejection_reason = reason or ''

            vendor.save()
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
    def get_vendor_bookings(cls, vendor_id=None, status=None, search=None, date=None, require_vendor=False):
        """
        Lấy danh sách các đơn đặt tour thực tế từ Database kèm bộ lọc
        """
        vendor = None
        if vendor_id:
            vendor = Vendors.objects.filter(id=vendor_id).first()
        if require_vendor and not vendor:
            return {
                'bookings': [],
                'stats': {
                    'total': 0,
                    'waiting_confirmation': 0,
                    'confirmed': 0,
                    'completed': 0,
                    'cancelled': 0,
                    'total_revenue': 0,
                },
            }

        # Đồng bộ tự động các đơn PayOS đang chờ xử lý của chính đối tác
        try:
            from apps.payments.views.payos_views import sync_pending_payos_transactions
            sync_pending_payos_transactions(limit=5, vendor=vendor)
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
            items = list(ov.orderitems_set.all())
            first_item = items[0] if items else None
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
    def create_vendor_booking(cls, data, vendor_id=None):
        """
        Vendor tạo đơn đặt hàng mới trực tiếp vào PostgreSQL
        """
        import random
        customer_email = (data.get('customer_email') or '').strip()
        customer = None
        if customer_email and '@' in customer_email:
            customer = Users.objects.filter(email__iexact=customer_email).first()
        if not customer:
            customer = Users.objects.filter(role='customer').first()

        vendor = Vendors.objects.filter(id=vendor_id).first() if vendor_id else Vendors.objects.first()
        requested_tour_id = data.get('tour_id') or data.get('experience_id')
        tour = None
        if requested_tour_id and str(requested_tour_id).isdigit():
            tour_qs = Tours.objects.filter(id=int(requested_tour_id))
            if vendor:
                tour_qs = tour_qs.filter(vendor=vendor)
            tour = tour_qs.first()
        if not tour:
            tour = Tours.objects.filter(vendor=vendor).first() if vendor else Tours.objects.first()

        order_code = f"ORD-{random.randint(100000, 999999)}"
        unit_price = Decimal(str(data.get('unit_price', tour.price if tour else 450000)))
        adults = max(1, int(data.get('adults_count', 1) or 1))
        children = max(0, int(data.get('children_count', 0) or 0))
        total_guests = adults + children
        total_price = (unit_price * adults) + (unit_price * children * Decimal('0.7')).quantize(Decimal('1'))

        with transaction.atomic():
            order = Orders.objects.create(
                customer=customer,
                order_code=order_code,
                grand_total=total_price,
                payment_status='paid' if data.get('payment_status') == 'paid' else 'pending',
                shipping_address={
                    'customer_name': data.get('customer_name', 'Khách hàng mới'),
                    'customer_phone': data.get('customer_phone', ''),
                    'customer_email': customer_email or 'guest@sontra.vn',
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

            schedule_obj = None
            schedule_id = data.get('schedule_id')
            if tour and schedule_id and str(schedule_id).isdigit():
                from apps.tours.models import TourSchedules
                schedule_obj = TourSchedules.objects.select_for_update().filter(id=int(schedule_id), tour=tour).first()
                if schedule_obj:
                    schedule_obj.booked_count = (schedule_obj.booked_count or 0) + total_guests
                    if schedule_obj.booked_count >= schedule_obj.max_capacity:
                        schedule_obj.status = 'full'
                    schedule_obj.save(update_fields=['booked_count', 'status', 'updated_at'])

            if tour:
                OrderItems.objects.create(
                    order_vendor=ov,
                    tour=tour,
                    tour_schedule=schedule_obj,
                    item_type='tour',
                    quantity=total_guests,
                    unit_price=unit_price,
                    price_at_sale_time=total_price
                )

            # Create ledger entry using standard 5% platform fee + 10% conservation fund
            if order.payment_status == 'paid':
                gross = total_price
                plat_fee = (gross * Decimal('0.05')).quantize(Decimal('0.01'))
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

            guests_label = f"{adults} người lớn" + (f", {children} trẻ em" if children > 0 else "")
            return {
                'id': str(ov.id),
                'order_code': order_code,
                'customer_name': data.get('customer_name', 'Khách hàng mới'),
                'customer_phone': data.get('customer_phone', ''),
                'customer_email': customer_email or 'guest@sontra.vn',
                'pickup_location': data.get('pickup_location', 'Đà Nẵng'),
                'experience_name': tour.title if tour else 'Trekking Sơn Trà',
                'booking_date': data.get('booking_date_formatted') or timezone.now().strftime('%d/%m/%Y'),
                'time_slot': data.get('time_slot') or '06:00 - 10:30',
                'adults_count': adults,
                'children_count': children,
                'guests_label': guests_label,
                'total_price': int(total_price),
                'total_price_formatted': f"{int(total_price):,} đ".replace(',', '.'),
                'status': ov.status,
                'status_label': 'Đã xác nhận' if ov.status == 'confirmed' else 'Chờ xác nhận',
                'payment_status': order.payment_status,
                'payment_status_label': 'Đã thanh toán' if order.payment_status == 'paid' else 'Chưa thanh toán',
                'payment_method': data.get('payment_method') or 'Tiền mặt tại quầy',
                'special_notes': data.get('special_notes', ''),
                'created_at': timezone.now().strftime('%d/%m/%Y %H:%M')
            }

    @classmethod
    def update_booking_status(cls, booking_id, new_status, vendor_id=None):
        """
        Cập nhật trạng thái đơn đặt trực tiếp trong PostgreSQL
        """
        valid_statuses = ('waiting_payment', 'waiting_confirmation', 'confirmed', 'completed', 'cancelled')
        if new_status not in valid_statuses:
            raise ValueError(f'Trạng thái đơn đặt chỗ không hợp lệ: {new_status}')

        with transaction.atomic():
            base_qs = OrderVendors.objects.select_for_update()
            if vendor_id:
                base_qs = base_qs.filter(vendor_id=vendor_id)
            ov = None
            if str(booking_id).isdigit():
                ov = base_qs.filter(id=int(booking_id)).first()
            if not ov:
                ov = base_qs.filter(order__order_code=str(booking_id)).first()

            if ov:
                previous_status = ov.status
                ov.status = new_status
                ov.save(update_fields=['status', 'updated_at'])

                if new_status == 'cancelled' and previous_status != 'cancelled':
                    from apps.tours.models import TourSchedules
                    from apps.flash_sales.models import CampaignItems
                    from django.db.models import F
                    for item in OrderItems.objects.filter(order_vendor=ov):
                        qty = max(1, int(item.quantity or 1))
                        if getattr(item, 'tour_schedule_id', None):
                            sch = TourSchedules.objects.select_for_update().filter(id=item.tour_schedule_id).first()
                            if sch:
                                sch.booked_count = max(0, (sch.booked_count or 0) - qty)
                                if sch.status == 'full' and sch.booked_count < sch.max_capacity:
                                    sch.status = 'open'
                                sch.save(update_fields=['booked_count', 'status', 'updated_at'])
                        if getattr(item, 'campaign_item_id', None):
                            ci = CampaignItems.objects.select_for_update().filter(id=item.campaign_item_id).first()
                            if ci:
                                ci.sold_quantity = max(0, (ci.sold_quantity or 0) - qty)
                                ci.save(update_fields=['sold_quantity', 'updated_at'])

                return {
                    'id': str(ov.id),
                    'status': new_status,
                    'status_label': 'Đã xác nhận' if new_status == 'confirmed' else ('Hoàn thành' if new_status == 'completed' else 'Đã hủy')
                }

        return None
