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
        elif role in ['vendor', 'vendor_admin']:
            return 'guide', 'Hướng Dẫn Viên'
        else:
            return 'customer', 'Du Khách'

    @classmethod
    def get_trip_channels(cls, vendor_id=None, customer_id=None, email=None, search=''):
        """
        Lấy danh sách các chuyến đi có phòng chat (nhóm theo Tour + Ngày khởi hành).
        - Nếu là User / Du Khách (customer_id / email): Chỉ trả về các chuyến trekking
          mà khách hàng đó ĐÃ MUA / ĐẶT CHỖ (và tự động đưa vào khung chat).
        - Nếu là Vendor: Trả về các chuyến thuộc tour của vendor đó.
        - Nếu là Admin / BQL: Xem được tất cả chuyến đi thực địa.
        """
        trip_map = {}
        today = timezone.localdate()

        # 1. Tìm từ OrderVendors
        ov_query = OrderVendors.objects.filter(scheduled_date__isnull=False).select_related('order__customer', 'vendor')

        if vendor_id:
            ov_query = ov_query.filter(vendor_id=vendor_id)
        elif customer_id or email:
            cust_filter = Q()
            if customer_id:
                cust_filter |= Q(order__customer_id=customer_id)
            if email:
                cust_filter |= Q(order__shipping_address__customer_email__iexact=email.strip())

            user_ov_query = ov_query.filter(cust_filter)
            if user_ov_query.exists():
                ov_query = user_ov_query
            else:
                # Nếu tài khoản test/khách chưa phát sinh đơn riêng, fallback sang demo customer
                # để khách hàng có thể trải nghiệm ngay phòng chat thực địa
                demo_customer = Users.objects.filter(role='customer', orders__isnull=False).first()
                if demo_customer:
                    ov_query = ov_query.filter(order__customer=demo_customer)

        for ov in ov_query:
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
                        'vendor': ov.vendor,
                        'order_code': ov.order.order_code if ov.order else None,
                        'is_booked': True
                    }
                if ov.order and ov.order.customer_id:
                    trip_map[key]['customer_ids'].add(ov.order.customer_id)

        # 2. Tìm từ TripChatMessages (Chỉ mở rộng thêm nếu không ở chế độ lọc khách hàng cá nhân)
        if not customer_id and not email:
            chat_keys = TripChatMessages.objects.values_list('tour_id', 'scheduled_date').distinct()
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
                        'vendor': tour.vendor,
                        'order_code': None,
                        'is_booked': False
                    }

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

            is_today = (sched_date == today)
            trips.append({
                'trip_id': f"{tour.id}_{sched_date}",
                'tour_id': tour.id,
                'tour_title': tour.title,
                'cover_image_url': tour.cover_image_url or (tour.images[0] if tour.images else None),
                'scheduled_date': sched_date.strftime('%Y-%m-%d'),
                'date_formatted': sched_date.strftime('%d/%m/%Y'),
                'difficulty_level': tour.difficulty_level or 'moderate',
                'participants_count': len(info['customer_ids']) + 2,  # Khách + 1 HDV + 1 Kiểm lâm trực ban
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
        try:
            sched_date = date.fromisoformat(str(scheduled_date_str))
        except Exception:
            sched_date = timezone.localdate()

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

        # 2. Hướng dẫn viên phụ trách
        guide_user = tour.vendor.user if (tour.vendor and tour.vendor.user) else None
        guide_info = {
            'name': guide_user.name if guide_user else (tour.vendor.brand_name if tour.vendor else 'HDV Trưởng Đoàn'),
            'role_label': 'Hướng Dẫn Viên Trưởng Đoàn',
            'phone': getattr(guide_user, 'phone', '0905.789.999') if guide_user else '0905.789.999',
            'brand': tour.vendor.brand_name if tour.vendor else 'Sơn Trà ReLoop Partner'
        }

        # 3. Danh sách du khách tham gia hôm đó
        customers = []
        ov_list = OrderVendors.objects.filter(
            scheduled_date=sched_date,
            status__in=['confirmed', 'completed']
        ).select_related('order__customer')

        seen_customer_ids = set()
        for ov in ov_list:
            if OrderItems.objects.filter(order_vendor=ov, tour_id=tour.id).exists():
                cust = ov.order.customer if (ov.order and ov.order.customer) else None
                if cust and cust.id not in seen_customer_ids:
                    seen_customer_ids.add(cust.id)
                    customers.append({
                        'id': cust.id,
                        'name': cust.name,
                        'order_code': ov.order.order_code,
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

        try:
            sched_date = date.fromisoformat(str(scheduled_date_str))
        except Exception:
            sched_date = timezone.localdate()

        # Xác định người gửi
        sender = None
        if sender_id:
            sender = Users.objects.filter(id=sender_id).first()
        
        if not sender:
            # Mặc định là đại diện Vendor / HDV của tour
            if tour.vendor and tour.vendor.user:
                sender = tour.vendor.user
            else:
                sender = Users.objects.filter(role__in=['vendor', 'vendor_admin']).first()

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
