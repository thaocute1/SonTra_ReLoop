from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from apps.accounts.models.user_models import Users
from ..models.vendor_models import Guides, Vendors
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
        tour_quality_rows = []
        for tour in Tours.objects.filter(vendor=vendor, deleted_at__isnull=True).order_by('id'):
            sales = tour_sales.get(tour.id, {})
            ticket_value = sales.get('ticket_value', 0)
            t_reviews = int(tour.total_reviews or 0)
            t_rating = float(tour.avg_rating) if t_reviews > 0 else 0.0
            if t_reviews >= 3 and t_rating < 3.0:
                q_level = 'critical'
            elif t_reviews >= 3 and t_rating < 3.5:
                q_level = 'warning'
            elif t_reviews == 0:
                q_level = 'new'
            else:
                q_level = 'healthy'
            tour_quality_rows.append({
                'id': tour.id,
                'title': tour.title,
                'avg_rating': t_rating,
                'total_reviews': t_reviews,
                'quality_level': q_level,
            })
            experience_performance.append({
                'id': tour.id,
                'name': tour.title,
                'bookings_count': sales.get('bookings', 0),
                'revenue': int(ticket_value),
                'revenue_formatted': f"{int(ticket_value):,} đ".replace(',', '.'),
                'rating': t_rating,
                'total_reviews': t_reviews,
                'quality_level': q_level,
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

        review_data = cls._collect_vendor_reviews(vendor.id)
        review_summary = review_data['summary']
        recent_reviews = [
            cls._serialize_vendor_review(*row)
            for row in review_data['parsed_rows'][:5]
        ]

        quality_alert = cls._build_quality_alert(
            vendor_avg=float(vendor.avg_rating) if int(vendor.total_reviews or 0) > 0 else 0.0,
            total_reviews=int(vendor.total_reviews or 0),
            low_unreplied_count=review_summary['low_unreplied_count'],
            tour_quality_rows=tour_quality_rows,
        )

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
                'avg_rating': float(vendor.avg_rating) if int(vendor.total_reviews or 0) > 0 else 0.0,
                'total_reviews': int(vendor.total_reviews or 0),
            },
            'quality_alert': quality_alert,
            'revenue_chart': revenue_chart,
            'reconciliation': reconciliation,
            'booking_overview': {
                name: booking_counts.get(name, 0)
                for name in ('confirmed', 'completed', 'cancelled')
            },
            'experience_performance': experience_performance,
            'recent_bookings': recent_list,
            'review_overview': {
                'summary': review_summary,
                'recent_reviews': recent_reviews,
            },
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
        refund_status_map = {
            'none': 'Không có',
            'requested': 'Chờ duyệt hoàn tiền',
            'in_review': 'Đang xem xét',
            'approved': 'Đã duyệt hoàn tiền',
            'refunded': 'Đã hoàn tiền',
            'rejected': 'Từ chối hoàn tiền',
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
                'refund_status': ov.refund_status or 'none',
                'refund_status_label': refund_status_map.get(ov.refund_status or 'none', 'Không có'),
                'refunded_amount': int(ov.refunded_amount or 0),
                'refund_reason': ov.refund_reason or '',
                'payment_status': ov.order.payment_status,
                'payment_status_label': (
                    'Đã hoàn tiền' if ov.order.payment_status == 'refunded'
                    else ('Đã thanh toán' if ov.order.payment_status == 'paid' else 'Chưa thanh toán')
                ),
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
    def _parse_booking_date(cls, raw_date):
        from datetime import datetime
        if not raw_date:
            return None
        if hasattr(raw_date, 'year') and hasattr(raw_date, 'month'):
            return raw_date
        raw_str = str(raw_date).strip()
        for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
            try:
                return datetime.strptime(raw_str, fmt).date()
            except ValueError:
                continue
        return None

    @classmethod
    def create_vendor_booking(cls, data, vendor_id=None):
        """
        Vendor tạo đơn đặt hàng mới trực tiếp vào PostgreSQL
        """
        import random
        customer_email = (data.get('customer_email') or '').strip()
        requested_tour_id = data.get('tour_id') or data.get('experience_id')
        adults = max(1, int(data.get('adults_count', 1) or 1))
        children = max(0, int(data.get('children_count', 0) or 0))
        total_guests = adults + children

        valid_create_statuses = ('waiting_payment', 'waiting_confirmation', 'confirmed', 'completed')
        requested_status = data.get('status') or 'confirmed'
        if requested_status not in valid_create_statuses:
            requested_status = 'confirmed'

        with transaction.atomic():
            customer = None
            if customer_email and '@' in customer_email:
                customer = Users.objects.filter(email__iexact=customer_email).first()
            if not customer:
                customer = Users.objects.filter(email='walkin@sontra.internal').first()
                if not customer:
                    customer = Users.objects.create(
                        name='Khách đặt tại quầy',
                        email='walkin@sontra.internal',
                        role='customer',
                        status='active',
                    )

            vendor = Vendors.objects.filter(id=vendor_id).first() if vendor_id else Vendors.objects.first()
            tour = None
            if requested_tour_id and str(requested_tour_id).isdigit():
                tour_qs = Tours.objects.filter(id=int(requested_tour_id))
                if vendor:
                    tour_qs = tour_qs.filter(vendor=vendor)
                tour = tour_qs.first()
            if not tour:
                tour = Tours.objects.filter(vendor=vendor).first() if vendor else Tours.objects.first()

            dep_date = cls._parse_booking_date(data.get('booking_date') or data.get('scheduled_date'))
            schedule_obj = None
            schedule_id = data.get('schedule_id')
            from apps.tours.models import TourSchedules
            if tour and schedule_id and str(schedule_id).isdigit():
                schedule_obj = TourSchedules.objects.select_for_update().filter(id=int(schedule_id), tour=tour).first()
            elif tour and dep_date:
                schedule_obj = TourSchedules.objects.select_for_update().filter(
                    tour=tour, departure_date=dep_date
                ).order_by('id').first()

            if schedule_obj:
                if schedule_obj.status == 'cancelled':
                    raise ValueError('Chuyến khởi hành này đã bị hủy.')
                remaining = max(0, (schedule_obj.max_capacity or 0) - (schedule_obj.booked_count or 0))
                if remaining < total_guests:
                    raise ValueError(f'Chuyến khởi hành chỉ còn {remaining} chỗ trống.')
                schedule_obj.booked_count = (schedule_obj.booked_count or 0) + total_guests
                new_remaining = max(0, (schedule_obj.max_capacity or 0) - schedule_obj.booked_count)
                schedule_obj.status = (
                    'full' if new_remaining <= 0
                    else ('almost_full' if new_remaining <= 3 else 'open')
                )
                schedule_obj.save(update_fields=['booked_count', 'status', 'updated_at'])
                if not dep_date:
                    dep_date = schedule_obj.departure_date

            if not dep_date:
                dep_date = timezone.localdate()

            order_code = f"ORD-{random.randint(100000, 999999)}"
            unit_price = Decimal(str(data.get('unit_price', tour.price if tour else 450000)))
            total_price = (unit_price * adults) + (unit_price * children * Decimal('0.7')).quantize(Decimal('1'))

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
                    'special_notes': data.get('special_notes', ''),
                    'adults_count': adults,
                    'children_count': children,
                }
            )

            ov = OrderVendors.objects.create(
                order=order,
                vendor=vendor,
                scheduled_date=dep_date,
                subtotal=total_price,
                status=requested_status,
                refund_status='none',
                refunded_amount=Decimal('0.00')
            )

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
                'booking_date': dep_date.strftime('%Y-%m-%d'),
                'booking_date_formatted': dep_date.strftime('%d/%m/%Y'),
                'time_slot': (getattr(schedule_obj, 'time_slot', None) or data.get('time_slot') or '06:00 - 10:30'),
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

        status_label_map = {
            'waiting_payment': 'Chờ thanh toán',
            'waiting_confirmation': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy',
        }

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
                from apps.tours.models import TourSchedules
                from apps.flash_sales.models import CampaignItems

                if previous_status == 'cancelled' and new_status != 'cancelled':
                    for item in OrderItems.objects.filter(order_vendor=ov):
                        qty = max(1, int(item.quantity or 1))
                        if getattr(item, 'tour_schedule_id', None):
                            sch = TourSchedules.objects.select_for_update().filter(id=item.tour_schedule_id).first()
                            if sch:
                                remaining = max(0, (sch.max_capacity or 0) - (sch.booked_count or 0))
                                if remaining < qty:
                                    raise ValueError(f'Không thể khôi phục đơn vì lịch khởi hành chỉ còn {remaining} chỗ.')
                                sch.booked_count = (sch.booked_count or 0) + qty
                                new_rem = max(0, (sch.max_capacity or 0) - sch.booked_count)
                                sch.status = 'full' if new_rem <= 0 else ('almost_full' if new_rem <= 3 else 'open')
                                sch.save(update_fields=['booked_count', 'status', 'updated_at'])
                        if getattr(item, 'campaign_item_id', None):
                            ci = CampaignItems.objects.select_for_update().filter(id=item.campaign_item_id).first()
                            if ci:
                                fs_rem = max(0, (ci.slot_quantity or 0) - (ci.sold_quantity or 0))
                                if fs_rem < qty:
                                    raise ValueError('Không đủ suất Flash Sale còn lại để khôi phục đơn.')
                                ci.sold_quantity = (ci.sold_quantity or 0) + qty
                                ci.save(update_fields=['sold_quantity', 'updated_at'])

                ov.status = new_status
                ov.save(update_fields=['status', 'updated_at'])

                if new_status == 'cancelled' and previous_status != 'cancelled':
                    for item in OrderItems.objects.filter(order_vendor=ov):
                        qty = max(1, int(item.quantity or 1))
                        if getattr(item, 'tour_schedule_id', None):
                            sch = TourSchedules.objects.select_for_update().filter(id=item.tour_schedule_id).first()
                            if sch:
                                sch.booked_count = max(0, (sch.booked_count or 0) - qty)
                                new_rem = max(0, (sch.max_capacity or 0) - sch.booked_count)
                                if sch.status != 'cancelled':
                                    sch.status = 'full' if new_rem <= 0 else ('almost_full' if new_rem <= 3 else 'open')
                                sch.save(update_fields=['booked_count', 'status', 'updated_at'])
                        if getattr(item, 'campaign_item_id', None):
                            ci = CampaignItems.objects.select_for_update().filter(id=item.campaign_item_id).first()
                            if ci:
                                ci.sold_quantity = max(0, (ci.sold_quantity or 0) - qty)
                                ci.save(update_fields=['sold_quantity', 'updated_at'])

                return {
                    'id': str(ov.id),
                    'status': new_status,
                    'status_label': status_label_map.get(new_status, new_status)
                }

        return None

    @staticmethod
    def _build_quality_alert(vendor_avg, total_reviews, low_unreplied_count, tour_quality_rows):
        flagged_tours = [
            row for row in (tour_quality_rows or [])
            if row.get('quality_level') in ('critical', 'warning')
        ]
        critical_tours = [row for row in flagged_tours if row.get('quality_level') == 'critical']

        if critical_tours or (total_reviews >= 3 and vendor_avg < 3.0):
            return {
                'level': 'critical',
                'title': 'Cảnh báo chất lượng nghiêm trọng (< 3.0★)',
                'message': (
                    'Có tuyến đạt điểm trung bình dưới 3.0★ (từ 3 đánh giá trở lên). '
                    'Hệ thống đang giảm ưu tiên gợi ý AI, tạm khóa đăng ký Flash Sale và khuyến nghị BQL kiểm tra lại quy trình dẫn tour.'
                ),
                'low_unreplied_count': low_unreplied_count,
                'flagged_tours': flagged_tours,
            }
        if flagged_tours or (total_reviews >= 3 and vendor_avg < 3.5):
            return {
                'level': 'warning',
                'title': 'Cảnh báo điểm hài lòng dưới ngưỡng 3.5★',
                'message': (
                    'Các tuyến có điểm trung bình dưới 3.5★ (từ 3 đánh giá trở lên) sẽ bị giảm thứ hạng gợi ý AI '
                    'và chưa đủ điều kiện tham gia Flash Sale cho đến khi cải thiện chất lượng.'
                ),
                'low_unreplied_count': low_unreplied_count,
                'flagged_tours': flagged_tours,
            }
        if low_unreplied_count > 0:
            return {
                'level': 'attention',
                'title': f'Có {low_unreplied_count} đánh giá thấp (1–2★) chờ phản hồi',
                'message': 'Hãy chủ động phản hồi công khai và liên hệ du khách để xử lý vấn đề sớm, tránh ảnh hưởng uy tín tuyến.',
                'low_unreplied_count': low_unreplied_count,
                'flagged_tours': flagged_tours,
            }
        return {
            'level': 'healthy',
            'title': 'Chất lượng vận hành ổn định',
            'message': '',
            'low_unreplied_count': 0,
            'flagged_tours': [],
        }

    @classmethod
    def _collect_vendor_reviews(cls, vendor_id):
        """Truy vấn và tổng hợp thống kê đánh giá đã duyệt của một đối tác."""
        from apps.gamification.models.gamification_models import Reviews
        from apps.tours.services.review_helpers import parse_review_payload

        qs = (
            Reviews.objects.filter(vendor_id=vendor_id, status='approved')
            .select_related('customer', 'tour', 'guide__user', 'order_vendor__order')
            .order_by('-created_at', '-id')
        )
        all_reviews = list(qs)

        rating_breakdown = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
        rating_sum = 0
        unreplied_count = 0
        low_rating_count = 0
        low_unreplied_count = 0
        five_star_count = 0

        parsed_rows = []
        for rev in all_reviews:
            r_val = max(1, min(5, int(rev.rating or 5)))
            rating_breakdown[str(r_val)] += 1
            rating_sum += r_val
            if r_val == 5:
                five_star_count += 1
            images, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            g_rating = meta.get('guide_rating')
            is_low = (r_val <= 2) or (g_rating is not None and int(g_rating) <= 2)
            if is_low:
                low_rating_count += 1
            if not vendor_reply:
                unreplied_count += 1
                if is_low:
                    low_unreplied_count += 1
            parsed_rows.append((rev, r_val, g_rating, is_low, images, vendor_reply, replied_at, meta))

        total_count = len(all_reviews)
        avg_rating = round(rating_sum / total_count, 2) if total_count > 0 else 0.0
        five_star_rate = round((five_star_count / total_count) * 100) if total_count > 0 else 0

        return {
            'summary': {
                'avg_rating': avg_rating,
                'total_reviews': total_count,
                'unreplied_count': unreplied_count,
                'low_rating_count': low_rating_count,
                'low_unreplied_count': low_unreplied_count,
                'five_star_count': five_star_count,
                'five_star_rate': five_star_rate,
                'rating_breakdown': rating_breakdown,
            },
            'parsed_rows': parsed_rows,
        }

    @staticmethod
    def _serialize_vendor_review(rev, r_val, g_rating, is_low, images, vendor_reply, replied_at, meta):
        from apps.tours.services.review_helpers import mask_customer_name

        cust_name = mask_customer_name(rev.customer.name if rev.customer else '')
        order_code = (
            rev.order_vendor.order.order_code
            if rev.order_vendor and getattr(rev.order_vendor, 'order', None)
            else f"OV-{rev.order_vendor_id}"
        )
        return {
            'id': rev.id,
            'tour_id': rev.tour_id,
            'tour_title': rev.tour.title if rev.tour else 'Trải nghiệm Sơn Trà',
            'guide_id': rev.guide_id,
            'guide_name': (
                rev.guide.user.name
                if (rev.guide and getattr(rev.guide, 'user', None))
                else None
            ),
            'guide_rating': g_rating,
            'order_vendor_id': rev.order_vendor_id,
            'order_code': order_code,
            'customer_name': cust_name,
            'rating': r_val,
            'tour_rating': r_val,
            'tour_tags': meta.get('tour_tags') or [],
            'guide_tags': meta.get('guide_tags') or [],
            'low_rating_reasons': meta.get('low_rating_reasons') or [],
            'edited_at': meta.get('edited_at'),
            'reports_count': len(meta.get('reports') or []),
            'is_low_rating': is_low,
            'comment': rev.comment or '',
            'images': images,
            'vendor_reply': vendor_reply,
            'replied_at': replied_at,
            'created_at': rev.created_at.strftime('%d/%m/%Y') if rev.created_at else '',
        }

    @classmethod
    def get_vendor_reviews(cls, vendor_id, tour_id=None, guide_id=None, rating=None, reply_status=None):
        """
        VT-06: Lấy danh sách đánh giá khách hàng cho các tour thuộc đơn vị lữ hành kèm thống kê Tour & HDV.
        """
        if not vendor_id:
            return {
                'summary': {
                    'avg_rating': 0.0,
                    'total_reviews': 0,
                    'unreplied_count': 0,
                    'low_rating_count': 0,
                    'low_unreplied_count': 0,
                    'five_star_count': 0,
                    'five_star_rate': 0,
                    'rating_breakdown': {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0},
                },
                'quality_alert': cls._build_quality_alert(0.0, 0, 0, []),
                'tours': [],
                'guides': [],
                'results': [],
            }

        vendor_tour_objs = list(
            Tours.objects.filter(vendor_id=vendor_id, deleted_at__isnull=True).order_by('id')
        )
        vendor_tours = [{'id': t.id, 'title': t.title} for t in vendor_tour_objs]
        vendor_guides = [
            {'id': g.id, 'name': g.user.name if getattr(g, 'user', None) else f'HDV #{g.id}'}
            for g in Guides.objects.filter(vendor_id=vendor_id).select_related('user').order_by('id')
        ]
        tour_quality_rows = []
        for t in vendor_tour_objs:
            t_reviews = int(t.total_reviews or 0)
            t_rating = float(t.avg_rating) if t_reviews > 0 else 0.0
            q_level = (
                'critical' if t_reviews >= 3 and t_rating < 3.0
                else ('warning' if t_reviews >= 3 and t_rating < 3.5 else ('new' if t_reviews == 0 else 'healthy'))
            )
            tour_quality_rows.append({
                'id': t.id,
                'title': t.title,
                'avg_rating': t_rating,
                'total_reviews': t_reviews,
                'quality_level': q_level,
            })

        collected = cls._collect_vendor_reviews(vendor_id)
        summary = collected['summary']
        parsed_rows = collected['parsed_rows']

        filter_tour_id = int(tour_id) if tour_id and str(tour_id).isdigit() else None
        filter_guide_id = int(guide_id) if guide_id and str(guide_id).isdigit() else None
        filter_star = int(rating) if rating and str(rating).isdigit() and 1 <= int(rating) <= 5 else None
        filter_reply = str(reply_status or 'all').strip().lower()

        results = []
        for row in parsed_rows:
            rev, r_val, _, is_low, _, vendor_reply, _, _ = row
            if filter_tour_id is not None and rev.tour_id != filter_tour_id:
                continue
            if filter_guide_id is not None and rev.guide_id != filter_guide_id:
                continue
            if filter_star is not None and r_val != filter_star:
                continue
            if filter_reply == 'pending' and vendor_reply:
                continue
            if filter_reply == 'replied' and not vendor_reply:
                continue
            if filter_reply == 'low_rating' and not is_low:
                continue

            results.append(cls._serialize_vendor_review(*row))

        return {
            'summary': summary,
            'quality_alert': cls._build_quality_alert(
                vendor_avg=summary['avg_rating'],
                total_reviews=summary['total_reviews'],
                low_unreplied_count=summary['low_unreplied_count'],
                tour_quality_rows=tour_quality_rows,
            ),
            'tours': vendor_tours,
            'guides': vendor_guides,
            'results': results,
        }

    @classmethod
    def reply_to_review(cls, vendor_id, review_id, reply_text):
        """
        VT-06: Đối tác lữ hành gửi hoặc cập nhật phản hồi cho đánh giá của du khách.
        """
        from apps.gamification.models.gamification_models import Reviews
        from apps.tours.services.review_helpers import (
            build_review_images_payload,
            mask_customer_name,
            parse_review_payload,
        )

        clean_reply = str(reply_text or '').strip()
        if not clean_reply:
            raise ValueError('Vui lòng nhập nội dung phản hồi cho du khách.')
        if len(clean_reply) > 1500:
            raise ValueError('Nội dung phản hồi không vượt quá 1.500 ký tự.')

        with transaction.atomic():
            rev = (
                Reviews.objects.select_for_update(of=('self',))
                .select_related('customer', 'tour')
                .filter(id=int(review_id), vendor_id=int(vendor_id))
                .first()
            )
            if not rev:
                return None

            images, _, _, meta = parse_review_payload(rev.images)
            replied_at_str = timezone.localtime().strftime('%d/%m/%Y %H:%M')
            rev.images = build_review_images_payload(
                images,
                meta=meta,
                vendor_reply=clean_reply,
                replied_at=replied_at_str,
            )
            rev.save(update_fields=['images', 'updated_at'])

        return {
            'id': rev.id,
            'tour_id': rev.tour_id,
            'tour_title': rev.tour.title if rev.tour else 'Trải nghiệm Sơn Trà',
            'customer_name': mask_customer_name(rev.customer.name if rev.customer else ''),
            'rating': int(rev.rating or 5),
            'comment': rev.comment or '',
            'images': images,
            'vendor_reply': clean_reply,
            'replied_at': replied_at_str,
            'created_at': rev.created_at.strftime('%d/%m/%Y') if rev.created_at else '',
        }
