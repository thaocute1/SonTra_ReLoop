from datetime import date, datetime
from django.utils import timezone
from django.db.models import Q
from apps.tours.models import Tours, TripChatMessages
from apps.orders.models import OrderVendors, OrderItems
from apps.accounts.models import Users


class TripChatService:
    @staticmethod
    def get_user_role_info(user):
        """
        Phân loại vai trò trong Box Chat 3 Bên:
        - BQL Kiểm Lâm (staff, system_admin)
        - Hướng Dẫn Viên / Đối tác (vendor, vendor_admin)
        - Du Khách (customer, khác)
        """
        if not user:
            return 'customer', 'Du Khách'
        
        role = getattr(user, 'role', '')
        if role in ['staff', 'system_admin']:
            return 'bql', 'BQL Kiểm Lâm'
        elif role in ['vendor', 'vendor_admin', 'guide']:
            return 'guide', 'Hướng Dẫn Viên'
        else:
            return 'customer', 'Du Khách'

    @staticmethod
    def _parse_scheduled_date(scheduled_date_str):
        if not scheduled_date_str:
            return None
        try:
            return date.fromisoformat(str(scheduled_date_str).strip())
        except (TypeError, ValueError):
            return None

    @classmethod
    def user_can_access_trip(cls, user, tour_id, scheduled_date_str=None):
        """Kiểm tra quyền tham gia phòng chat chuyến đi của user hiện tại."""
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        sched_date = cls._parse_scheduled_date(scheduled_date_str)
        if not sched_date:
            return False

        role = getattr(user, 'role', '')
        if role in ['staff', 'system_admin']:
            return True
        if role in ['vendor', 'vendor_admin']:
            return Tours.objects.filter(id=tour_id, vendor__user_id=user.id).exists()
        if role == 'guide':
            from ..models.vendor_models import Guides
            vendor_id = Guides.objects.filter(user_id=user.id).values_list('vendor_id', flat=True).first()
            return bool(vendor_id and Tours.objects.filter(id=tour_id, vendor_id=vendor_id).exists())

        return OrderItems.objects.filter(
            tour_id=tour_id,
            order_vendor__order__customer_id=user.id,
            order_vendor__scheduled_date=sched_date,
            order_vendor__status__in=['confirmed', 'completed'],
            order_vendor__order__payment_status='paid',
        ).exists()

    @classmethod
    def get_trip_channels(cls, vendor_id=None, customer_id=None, email=None, search=''):
        """
        Lấy danh sách các chuyến đi có phòng chat (nhóm theo Tour + Ngày khởi hành).
        - Nếu là User / Du Khách (customer_id / email): Chỉ trả về các chuyến trekking
          mà khách hàng đó ĐÃ THANH TOÁN & XÁC NHẬN.
        - Nếu là Vendor: Trả về các chuyến thuộc tour của vendor đó.
        - Nếu là Admin / BQL: Xem được tất cả chuyến đi thực địa.
        """
        trip_map = {}
        today = timezone.localdate()

        # 1. Tìm từ OrderVendors (chỉ các đơn đã thanh toán & xác nhận/hoàn thành)
        ov_query = OrderVendors.objects.filter(
            scheduled_date__isnull=False,
            status__in=['confirmed', 'completed'],
            order__payment_status='paid',
        ).select_related('order__customer', 'vendor')

        if vendor_id:
            ov_query = ov_query.filter(vendor_id=vendor_id)
        elif customer_id:
            ov_query = ov_query.filter(order__customer_id=customer_id)
        elif email:
            ov_query = ov_query.filter(order__customer__email__iexact=email.strip())

        for ov in ov_query:
            if ov.order and ov.order.payment_status != 'paid':
                continue
            items = OrderItems.objects.filter(order_vendor=ov, tour__isnull=False).select_related('tour')
            for it in items:
                tour = it.tour
                if search and search.lower() not in tour.title.lower():
                    continue
                key = (tour.id, ov.scheduled_date)
                if key not in trip_map:
                    trip_map[key] = {
                        'tour': tour,
                        'date': ov.scheduled_date,
                        'customer_ids': set(),
                        'guest_count': 0,
                        'vendor': ov.vendor,
                        'order_code': ov.order.order_code if ov.order else None,
                        'is_booked': True
                    }
                trip_map[key]['guest_count'] += (it.quantity or 1)
                if ov.order and ov.order.customer_id:
                    trip_map[key]['customer_ids'].add(ov.order.customer_id)

        # 2. Tìm từ TripChatMessages (Chỉ mở rộng thêm nếu không ở chế độ lọc khách hàng cá nhân)
        if not customer_id and not email:
            chat_qs = TripChatMessages.objects.all()
            if vendor_id:
                chat_qs = chat_qs.filter(tour__vendor_id=vendor_id)
            chat_keys = chat_qs.values_list('tour_id', 'scheduled_date').distinct()
            for tour_id, sched_date in chat_keys:
                key = (tour_id, sched_date)
                if key not in trip_map:
                    tour = Tours.objects.filter(id=tour_id).first()
                    if not tour:
                        continue
                    if search and search.lower() not in tour.title.lower():
                        continue
                    trip_map[key] = {
                        'tour': tour,
                        'date': sched_date,
                        'customer_ids': set(),
                        'guest_count': 0,
                        'vendor': tour.vendor,
                        'order_code': None,
                        'is_booked': False
                    }

        from apps.tours.models import TourSchedules
        tour_ids = [t_id for (t_id, _) in trip_map.keys()]
        sched_dates = [d for (_, d) in trip_map.keys()]
        schedule_guide_map = {}
        if tour_ids and sched_dates:
            for sched in TourSchedules.objects.filter(
                tour_id__in=tour_ids,
                departure_date__in=sched_dates,
                guide__isnull=False,
            ).select_related('guide__user'):
                if sched.guide and sched.guide.user:
                    schedule_guide_map[(sched.tour_id, sched.departure_date)] = sched.guide

        trips = []
        for (t_id, sched_date), info in trip_map.items():
            tour = info['tour']
            last_msg = TripChatMessages.objects.filter(tour=tour, scheduled_date=sched_date).select_related('sender').order_by('-created_at').first()

            last_msg_data = None
            if last_msg:
                role_key, role_label = cls.get_user_role_info(last_msg.sender)
                last_msg_data = {
                    'content': last_msg.content,
                    'sender_name': last_msg.sender.name if last_msg.sender else 'Thành viên',
                    'sender_role': role_key,
                    'sender_role_label': role_label,
                    'time_formatted': last_msg.created_at.strftime('%H:%M'),
                    'message_type': last_msg.message_type
                }

            guide_obj = schedule_guide_map.get((tour.id, sched_date))
            guide_user = guide_obj.user if guide_obj else (
                tour.vendor.user if (tour.vendor and tour.vendor.user) else None
            )
            guide_name = (
                guide_user.name
                if guide_user
                else (tour.vendor.brand_name if tour.vendor else 'HDV Trưởng Đoàn')
            )
            guide_phone = (
                (getattr(guide_user, 'phone', None) if guide_user else None)
                or (tour.vendor.phone if tour.vendor else None)
            )

            is_today = (sched_date == today)
            trips.append({
                'trip_id': f"{tour.id}_{sched_date}",
                'tour_id': tour.id,
                'tour_title': tour.title,
                'cover_image_url': tour.cover_image_url or (tour.images[0] if tour.images else None),
                'scheduled_date': sched_date.strftime('%Y-%m-%d'),
                'date_formatted': sched_date.strftime('%d/%m/%Y'),
                'scheduled_date_formatted': sched_date.strftime('%d/%m/%Y'),
                'difficulty_level': tour.difficulty_level or 'moderate',
                'total_guests': info.get('guest_count', 0),
                'participants_count': max(info.get('guest_count', 0), len(info['customer_ids'])) + 2,  # Khách + 1 HDV + 1 Kiểm lâm trực ban
                'guide_name': guide_name,
                'guide_phone': guide_phone,
                'is_assigned_guide': bool(guide_obj),
                'last_message': last_msg_data,
                'is_today': is_today,
                'order_code': info.get('order_code'),
                'is_booked': info.get('is_booked', True),
                'ticket_status': 'confirmed'
            })

        # Sắp xếp: Chuyến hôm nay lên đầu, sau đó theo ngày gần nhất
        trips.sort(key=lambda x: (not x['is_today'], abs((date.fromisoformat(x['scheduled_date']) - today).days)))
        return trips

    @classmethod
    def get_trip_messages(cls, tour_id, scheduled_date_str, current_user_id=None):
        """
        Lấy toàn bộ tin nhắn & thông tin phòng chat của chuyến đi
        """
        sched_date = cls._parse_scheduled_date(scheduled_date_str)
        if not sched_date:
            raise ValueError("Tham số ngày khởi hành không hợp lệ (định dạng YYYY-MM-DD).")

        tour = Tours.objects.filter(id=tour_id).first()
        if not tour:
            return None

        # Lấy danh sách thành viên đoàn thực địa
        # 1. Ban Quản Lý Sơn Trà & Kiểm Lâm
        bql_rep = Users.objects.filter(role__in=['staff', 'system_admin']).first()
        bql_info = {
            'name': bql_rep.name if bql_rep else 'Ban Quản Lý & Kiểm Lâm Sơn Trà',
            'role_label': 'Trực Ban Kiểm Lâm',
            'hotline': '0236.3.844.567',
            'sos_hotline': '114 / 0905.123.456'
        }

        # 2. Hướng dẫn viên phụ trách (ưu tiên HDV được phân công trên TourSchedules hoặc OrderVendors)
        from apps.tours.models import TourSchedules
        assigned_schedule = (
            TourSchedules.objects.filter(tour=tour, departure_date=sched_date)
            .select_related('guide__user')
            .order_by('-guide_id')
            .first()
        )
        guide_obj = assigned_schedule.guide if (assigned_schedule and assigned_schedule.guide) else None
        if not guide_obj:
            assigned_ov = (
                OrderVendors.objects.filter(
                    scheduled_date=sched_date,
                    orderitems__tour=tour,
                    guide__isnull=False,
                )
                .select_related('guide__user')
                .first()
            )
            if assigned_ov and assigned_ov.guide:
                guide_obj = assigned_ov.guide

        guide_user = (
            guide_obj.user
            if (guide_obj and getattr(guide_obj, 'user', None))
            else (tour.vendor.user if (tour.vendor and tour.vendor.user) else None)
        )
        guide_languages = []
        if guide_obj and isinstance(guide_obj.languages, list):
            guide_languages = [str(lang).strip() for lang in guide_obj.languages if str(lang).strip()]

        from apps.tours.services.review_helpers import guide_review_summary
        guide_stats = guide_review_summary(guide_obj.id) if guide_obj else None

        guide_info = {
            'id': guide_obj.id if guide_obj else None,
            'user_id': guide_user.id if guide_user else None,
            'name': (
                guide_user.name
                if guide_user
                else (tour.vendor.brand_name if tour.vendor else 'HDV Trưởng Đoàn')
            ),
            'role_label': 'Hướng Dẫn Viên Phụ Trách' if guide_obj else 'Điều Hành Đơn Vị',
            'is_assigned_guide': bool(guide_obj),
            'avatar_url': getattr(guide_user, 'avatar_url', None) if guide_user else None,
            'phone': (
                (getattr(guide_user, 'phone', None) if guide_user else None)
                or (tour.vendor.phone if tour.vendor else None)
                or 'Đang cập nhật'
            ),
            'email': (
                (getattr(guide_user, 'email', None) if guide_user else None)
                or (tour.vendor.email if tour.vendor else None)
            ),
            'license_number': guide_obj.license_number if guide_obj else None,
            'languages': guide_languages,
            'experience_years': int(guide_obj.experience_years or 0) if guide_obj else None,
            'avg_rating': guide_stats['avg_rating'] if guide_stats else None,
            'total_reviews': guide_stats['total_reviews'] if guide_stats else 0,
            'top_tags': guide_stats['top_tags'] if guide_stats else [],
            'brand': tour.vendor.brand_name if tour.vendor else 'Sơn Trà ReLoop Partner',
        }
        time_slot = (
            f"{str(assigned_schedule.start_time)[:5]} - {str(assigned_schedule.end_time)[:5]}"
            if (assigned_schedule and assigned_schedule.start_time and assigned_schedule.end_time)
            else None
        )

        # 3. Danh sách du khách tham gia hôm đó (chỉ lấy đơn đã thanh toán & đã xác nhận)
        customers = []
        ov_list = OrderVendors.objects.filter(
            scheduled_date=sched_date,
            status__in=['confirmed', 'completed'],
            order__payment_status='paid',
        ).select_related('order__customer')

        seen_booking_keys = set()
        for ov in ov_list:
            matching_items = OrderItems.objects.filter(order_vendor=ov, tour_id=tour.id)
            if not matching_items.exists():
                continue
            cust = ov.order.customer if (ov.order and ov.order.customer) else None
            shipping = ov.order.shipping_address if (ov.order and isinstance(ov.order.shipping_address, dict)) else {}
            if cust and getattr(cust, 'email', None) != 'walkin@sontra.internal':
                display_name = cust.name
            else:
                display_name = shipping.get('customer_name') or (cust.name if cust else None)
            if not display_name:
                continue
            order_code = ov.order.order_code if ov.order else None
            booking_key = (cust.id if cust else None, order_code)
            if booking_key not in seen_booking_keys:
                seen_booking_keys.add(booking_key)
                guest_qty = sum((it.quantity or 1) for it in matching_items)
                customers.append({
                    'id': f"{cust.id if cust else 'guest'}_{order_code or ov.id}",
                    'customer_id': cust.id if cust else None,
                    'name': display_name,
                    'order_code': order_code,
                    'guests_count': guest_qty,
                    'checkin_status': 'Đã xác nhận' if ov.status == 'confirmed' else 'Hoàn thành',
                    'role_label': 'Du Khách'
                })

        # Lấy danh sách tin nhắn
        messages_qs = TripChatMessages.objects.filter(
            tour=tour,
            scheduled_date=sched_date
        ).select_related('sender').order_by('created_at')

        message_list = []
        for m in messages_qs:
            role_key, role_label = cls.get_user_role_info(m.sender)
            is_me = (current_user_id and m.sender_id == current_user_id)
            message_list.append({
                'id': m.id,
                'sender_id': m.sender_id,
                'sender_name': m.sender.name if m.sender else 'Thành viên',
                'sender_role': role_key,
                'sender_role_label': role_label,
                'content': m.content,
                'message_type': m.message_type,
                'image_url': m.image_url,
                'created_at': m.created_at.isoformat(),
                'time_formatted': m.created_at.strftime('%H:%M'),
                'is_me': is_me
            })

        return {
            'trip': {
                'tour_id': tour.id,
                'tour_title': tour.title,
                'cover_image_url': tour.cover_image_url or (tour.images[0] if tour.images else None),
                'scheduled_date': sched_date.strftime('%Y-%m-%d'),
                'date_formatted': sched_date.strftime('%d/%m/%Y'),
                'time_slot': time_slot,
                'difficulty_level': tour.difficulty_level,
                'bql': bql_info,
                'guide': guide_info,
                'customers': customers,
                'total_members': len(customers) + 2
            },
            'messages': message_list
        }

    @classmethod
    def send_message(cls, tour_id, scheduled_date_str, content, message_type='text', image_url=None, sender_id=None):
        """
        Gửi tin nhắn mới vào phòng chat chuyến đi
        """
        tour = Tours.objects.filter(id=tour_id).first()
        if not tour:
            raise ValueError(f"Không tìm thấy Tour #{tour_id}")

        sched_date = cls._parse_scheduled_date(scheduled_date_str)
        if not sched_date:
            raise ValueError("Tham số ngày khởi hành không hợp lệ (định dạng YYYY-MM-DD).")

        # Xác định người gửi
        sender = Users.objects.filter(id=sender_id).first() if sender_id else None
        if not sender:
            raise ValueError("Không xác định được tài khoản người gửi hợp lệ.")

        new_msg = TripChatMessages.objects.create(
            tour=tour,
            scheduled_date=sched_date,
            sender=sender,
            message_type=message_type or 'text',
            content=content.strip(),
            image_url=image_url or None,
            created_at=timezone.now()
        )

        role_key, role_label = cls.get_user_role_info(new_msg.sender)
        return {
            'id': new_msg.id,
            'sender_id': new_msg.sender_id,
            'sender_name': new_msg.sender.name if new_msg.sender else 'Thành viên',
            'sender_role': role_key,
            'sender_role_label': role_label,
            'content': new_msg.content,
            'message_type': new_msg.message_type,
            'image_url': new_msg.image_url,
            'created_at': new_msg.created_at.isoformat(),
            'time_formatted': new_msg.created_at.strftime('%H:%M'),
            'is_me': True
        }
