from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
import random
import datetime

from apps.vendors.models.vendor_models import Vendors, Guides
from apps.vendors.services.vendor_service import VendorService


class TourService:
    """
    Tầng xử lý nghiệp vụ Quản lý Tour Trekking, Lịch Khởi Hành & Đặt Chỗ
    """

    # In-memory storage cho Tours và Departure Schedules (đồng bộ và fallback an toàn)
    _mock_tours = [
        {
            'id': 1,
            'title': 'Chinh phục Đỉnh Bàn Cờ - Ngắm Hoàng Hôn',
            'slug': 'chinh-phuc-dinh-ban-co-ngam-hoang-hon',
            'description': 'Hành trình trekking xuyên rừng nguyên sinh Sơn Trà, vượt dốc đá tự nhiên lên đỉnh Bàn Cờ ở độ cao 700m ngắm trọn vịnh Đà Nẵng lúc hoàng hôn buông xuống.',
            'cover_image_url': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
            'images': [
                'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80'
            ],
            'price': 450000,
            'price_formatted': '450.000 đ',
            'max_capacity': 15,
            'difficulty_level': 'moderate',
            'difficulty_label': 'Trung bình',
            'duration_hours': 4.5,
            'avg_rating': 4.9,
            'total_reviews': 58,
            'status': 'published',
            'vendor_id': 1,
            'vendor_name': 'Sơn Trà Trekking',
            'esg_fund_percent': 10,
            'route': {
                'start_point': 'Chân dốc Hoàng Sa, Thọ Quang',
                'end_point': 'Đỉnh Bàn Cờ (Độ cao 700m)',
                'total_distance_km': 4.5,
                'elevation_gain_m': 350
            },
            'checkpoints': [
                {'order_index': 1, 'name': 'Trạm Kiểm Lâm Suối Lớn', 'type': 'checkpoint', 'desc': 'Điểm danh đầu tuyến, kiểm tra giày và nước.'},
                {'order_index': 2, 'name': 'Vọng Cảnh Vịnh Đà Nẵng', 'type': 'rest_stop', 'desc': 'Điểm ngắm Voọc Chà Vá chân nâu chuyền cành.'},
                {'order_index': 3, 'name': 'Đỉnh Bàn Cờ Tiên', 'type': 'finish_checkpoint', 'desc': 'Đích đến, check-in GPS và ngắm hoàng hôn.'}
            ],
            'schedules': [
                {
                    'id': 'SCH-101',
                    'tour_id': 1,
                    'departure_date': '24/10/2026',
                    'time_slot': '06:00 - 10:30',
                    'max_capacity': 15,
                    'booked_count': 11,
                    'remaining_slots': 4,
                    'guide_name': 'Nguyễn Tuấn Anh (Thẻ BQL #G08)',
                    'price': 382500,
                    'price_formatted': '382.500 đ',
                    'status': 'open',
                    'status_label': 'Còn 4 chỗ trống'
                },
                {
                    'id': 'SCH-102',
                    'tour_id': 1,
                    'departure_date': '25/10/2026',
                    'time_slot': '14:30 - 18:30',
                    'max_capacity': 15,
                    'booked_count': 6,
                    'remaining_slots': 9,
                    'guide_name': 'Trần Minh Đức (Thẻ BQL #G12)',
                    'price': 382500,
                    'price_formatted': '382.500 đ',
                    'status': 'open',
                    'status_label': 'Còn 9 chỗ trống'
                },
                {
                    'id': 'SCH-103',
                    'tour_id': 1,
                    'departure_date': '31/10/2026',
                    'time_slot': '06:00 - 10:30',
                    'max_capacity': 15,
                    'booked_count': 15,
                    'remaining_slots': 0,
                    'guide_name': 'Lê Hoàng Nam (Thẻ BQL #G05)',
                    'price': 450000,
                    'price_formatted': '450.000 đ',
                    'status': 'full',
                    'status_label': 'Đã đủ đoàn'
                }
            ]
        },
        {
            'id': 2,
            'title': 'Khám phá Rừng Cây Đa ngàn năm Sơn Trà',
            'slug': 'kham-pha-rung-cay-da-ngan-nam-son-tra',
            'description': 'Tuyến trekking nhẹ nhàng dưới tán rừng già nguyên sinh Bãi Bắc, chiêm ngưỡng Cây Đa Di Sản ngàn năm tuổi với chu vi rễ phụ khổng lồ và ngắm chim muông sinh thái.',
            'cover_image_url': 'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=800&q=80',
            'images': [
                'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=800&q=80'
            ],
            'price': 400000,
            'price_formatted': '400.000 đ',
            'max_capacity': 20,
            'difficulty_level': 'easy',
            'difficulty_label': 'Dễ (Phù hợp gia đình)',
            'duration_hours': 3.5,
            'avg_rating': 4.8,
            'total_reviews': 42,
            'status': 'published',
            'vendor_id': 1,
            'vendor_name': 'Sơn Trà Trekking',
            'esg_fund_percent': 10,
            'route': {
                'start_point': 'Bến thuyền Bãi Bắc',
                'end_point': 'Cây Đa Di Sản Ngàn Năm',
                'total_distance_km': 3.2,
                'elevation_gain_m': 120
            },
            'checkpoints': [
                {'order_index': 1, 'name': 'Cửa Rừng Bãi Bắc', 'type': 'checkpoint', 'desc': 'Trạm hướng dẫn nội quy bảo vệ loài Voọc.'},
                {'order_index': 2, 'name': 'Cây Đa Di Sản', 'type': 'finish_checkpoint', 'desc': 'Khu bảo tồn rễ phụ, nhặt rác thu gom điểm xanh.'}
            ],
            'schedules': [
                {
                    'id': 'SCH-201',
                    'tour_id': 2,
                    'departure_date': '24/10/2026',
                    'time_slot': '07:30 - 11:00',
                    'max_capacity': 20,
                    'booked_count': 14,
                    'remaining_slots': 6,
                    'guide_name': 'Võ Quốc Huy (Thẻ BQL #G15)',
                    'price': 400000,
                    'price_formatted': '400.000 đ',
                    'status': 'open',
                    'status_label': 'Còn 6 chỗ trống'
                },
                {
                    'id': 'SCH-202',
                    'tour_id': 2,
                    'departure_date': '25/10/2026',
                    'time_slot': '13:30 - 17:00',
                    'max_capacity': 20,
                    'booked_count': 8,
                    'remaining_slots': 12,
                    'guide_name': 'Võ Quốc Huy (Thẻ BQL #G15)',
                    'price': 400000,
                    'price_formatted': '400.000 đ',
                    'status': 'open',
                    'status_label': 'Còn 12 chỗ trống'
                }
            ]
        },
        {
            'id': 3,
            'title': 'Chinh phục Mũi Nghê - Đón Bình Minh Sớm',
            'slug': 'chinh-phuc-mui-nghe-don-binh-minh-som',
            'description': 'Tuyến trekking thử thách mạo hiểm qua vách đá gồ ghề ra mũi cực Đông Đà Nẵng đón ánh bình minh đầu tiên rọi xuống mặt biển và hồ bơi tự nhiên giữa ghềnh đá.',
            'cover_image_url': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
            'images': [
                'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
            ],
            'price': 550000,
            'price_formatted': '550.000 đ',
            'max_capacity': 12,
            'difficulty_level': 'challenging',
            'difficulty_label': 'Thử thách (Địa hình đá)',
            'duration_hours': 5.0,
            'avg_rating': 4.7,
            'total_reviews': 31,
            'status': 'published',
            'vendor_id': 1,
            'vendor_name': 'Sơn Trà Trekking',
            'esg_fund_percent': 10,
            'route': {
                'start_point': 'Đường lên trạm Radar 29',
                'end_point': 'Vách đá Mũi Nghê',
                'total_distance_km': 5.8,
                'elevation_gain_m': 420
            },
            'checkpoints': [
                {'order_index': 1, 'name': 'Dốc Cây Khế', 'type': 'checkpoint', 'desc': 'Xuất phát 05:00 sáng mang đèn pin.'},
                {'order_index': 2, 'name': 'Hồ Bơi Tự Nhiên Mũi Nghê', 'type': 'finish_checkpoint', 'desc': 'Đón bình minh và check-in GPS trạm cuối.'}
            ],
            'schedules': [
                {
                    'id': 'SCH-301',
                    'tour_id': 3,
                    'departure_date': '25/10/2026',
                    'time_slot': '05:00 - 09:30',
                    'max_capacity': 12,
                    'booked_count': 9,
                    'remaining_slots': 3,
                    'guide_name': 'Trần Minh Đức (Thẻ BQL #G12)',
                    'price': 550000,
                    'price_formatted': '550.000 đ',
                    'status': 'open',
                    'status_label': 'Chỉ còn 3 chỗ'
                }
            ]
        }
    ]

    @classmethod
    def get_published_tours(cls, difficulty=None, search=None):
        """
        Lấy danh sách các tour đã xuất bản kèm chuyến khởi hành sắp tới gần nhất
        """
        tours = [t for t in cls._mock_tours if t.get('status') == 'published']

        if difficulty and difficulty != 'all':
            tours = [t for t in tours if t.get('difficulty_level') == difficulty]

        if search:
            s = search.lower().strip()
            tours = [t for t in tours if s in t.get('title', '').lower() or s in t.get('description', '').lower()]

        # Tính toán thông tin chuyến đi gần nhất cho từng tour
        for tour in tours:
            open_schedules = [sch for sch in tour.get('schedules', []) if sch.get('status') == 'open' and sch.get('remaining_slots', 0) > 0]
            if open_schedules:
                nearest = open_schedules[0]
                tour['_next_departure'] = f"{nearest['departure_date']} ({nearest['time_slot']})"
                tour['_available_slots'] = nearest['remaining_slots']
            else:
                tour['_next_departure'] = 'Hiện đã hết chuyến'
                tour['_available_slots'] = 0

        return tours

    @classmethod
    def get_tour_detail(cls, tour_id):
        """
        Lấy chi tiết tour, lộ trình, checkpoints và danh sách các chuyến khởi hành còn chỗ
        """
        for t in cls._mock_tours:
            if str(t.get('id')) == str(tour_id) or t.get('slug') == str(tour_id):
                return t
        return None

    @classmethod
    def get_vendor_tours(cls, vendor_id=None):
        """
        Lấy danh sách các tour thuộc sở hữu của Vendor
        """
        # Nếu vendor_id cung cấp, lọc theo vendor_id
        if vendor_id:
            return [t for t in cls._mock_tours if str(t.get('vendor_id')) == str(vendor_id)]
        return cls._mock_tours

    @classmethod
    def create_vendor_tour(cls, vendor_id, data):
        """
        Vendor tạo trải nghiệm trekking mới:
        1. Tạo thông tin cơ bản
        2. Thiết lập lộ trình & Checkpoint GPS
        3. Tạo chuyến khởi hành đầu tiên (nếu có)
        """
        new_id = len(cls._mock_tours) + 1
        title = data.get('title', 'Trekking Sơn Trà Mới')
        slug = slugify(title) + f"-{new_id}"

        price = int(data.get('price', 450000))
        max_capacity = int(data.get('max_capacity', 15))

        # Checkpoints
        raw_cps = data.get('checkpoints', [])
        checkpoints = []
        if raw_cps:
            for idx, cp in enumerate(raw_cps, start=1):
                checkpoints.append({
                    'order_index': idx,
                    'name': cp.get('name', f'Trạm {idx}'),
                    'type': cp.get('type', 'checkpoint'),
                    'desc': cp.get('desc', 'Trạm dừng chân và kiểm tra an toàn.')
                })
        else:
            checkpoints = [
                {'order_index': 1, 'name': 'Điểm Tập Kết Xuất Phát', 'type': 'checkpoint', 'desc': 'Kiểm tra trang thiết bị và điểm danh.'},
                {'order_index': 2, 'name': 'Đích Đến Hoàn Thành', 'type': 'finish_checkpoint', 'desc': 'Check-in GPS trạm cuối.'}
            ]

        # Khởi tạo Chuyến Khởi Hành đầu tiên nếu có truyền
        initial_sched = data.get('initial_schedule', {})
        schedules = []
        if initial_sched and initial_sched.get('departure_date'):
            schedules.append({
                'id': f'SCH-{new_id}01',
                'tour_id': new_id,
                'departure_date': initial_sched.get('departure_date'),
                'time_slot': initial_sched.get('time_slot', '06:00 - 10:30'),
                'max_capacity': max_capacity,
                'booked_count': 0,
                'remaining_slots': max_capacity,
                'guide_name': initial_sched.get('guide_name', 'Hướng Dẫn Viên Sơn Trà'),
                'price': price,
                'price_formatted': f"{price:,} đ".replace(',', '.'),
                'status': 'open',
                'status_label': f'Còn {max_capacity} chỗ'
            })

        new_tour = {
            'id': new_id,
            'title': title,
            'slug': slug,
            'description': data.get('description', 'Trải nghiệm khám phá sinh thái bán đảo Sơn Trà.'),
            'cover_image_url': data.get('cover_image_url', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80'),
            'images': data.get('images', []),
            'price': price,
            'price_formatted': f"{price:,} đ".replace(',', '.'),
            'max_capacity': max_capacity,
            'difficulty_level': data.get('difficulty_level', 'moderate'),
            'difficulty_label': 'Trung bình' if data.get('difficulty_level') == 'moderate' else ('Dễ' if data.get('difficulty_level') == 'easy' else 'Thử thách'),
            'duration_hours': float(data.get('duration_hours', 4.0)),
            'avg_rating': 5.0,
            'total_reviews': 0,
            'status': 'published',  # Đã kích hoạt cho phép đặt ngay
            'vendor_id': vendor_id or 1,
            'vendor_name': 'Sơn Trà Trekking',
            'esg_fund_percent': 10,
            'route': {
                'start_point': data.get('start_point', 'Bán đảo Sơn Trà'),
                'end_point': data.get('end_point', 'Đỉnh núi Sơn Trà'),
                'total_distance_km': float(data.get('total_distance_km', 4.0)),
                'elevation_gain_m': int(data.get('elevation_gain_m', 200))
            },
            'checkpoints': checkpoints,
            'schedules': schedules
        }

        cls._mock_tours.insert(0, new_tour)
        return new_tour

    @classmethod
    def create_tour_schedule(cls, tour_id, data):
        """
        Vendor mở thêm chuyến khởi hành mới cho một tour
        """
        tour = cls.get_tour_detail(tour_id)
        if not tour:
            return None

        sched_id = f"SCH-{tour['id']}{random.randint(10, 99)}"
        max_cap = int(data.get('max_capacity', tour.get('max_capacity', 15)))
        price = int(data.get('price', tour.get('price', 450000)))

        new_schedule = {
            'id': sched_id,
            'tour_id': tour['id'],
            'departure_date': data.get('departure_date', timezone.now().strftime('%d/%m/%Y')),
            'time_slot': data.get('time_slot', '06:00 - 10:30'),
            'max_capacity': max_cap,
            'booked_count': 0,
            'remaining_slots': max_cap,
            'guide_name': data.get('guide_name', 'Nguyễn Tuấn Anh (Thẻ BQL #G08)'),
            'price': price,
            'price_formatted': f"{price:,} đ".replace(',', '.'),
            'status': 'open',
            'status_label': f'Còn {max_cap} chỗ trống'
        }

        if 'schedules' not in tour:
            tour['schedules'] = []
        tour['schedules'].append(new_schedule)

        return new_schedule

    @classmethod
    def book_tour_slot(cls, booking_data):
        """
        Du khách (hoặc Vendor) đặt chỗ cho một Chuyến Khởi Hành cụ thể:
        - Kiểm tra số chỗ còn trống
        - Trừ số chỗ (cộng booked_count)
        - Tính 10% Quỹ Bảo tồn Sơn Trà
        - Tạo mã đơn #BK...
        - Đẩy dữ liệu vào VendorService._mock_bookings để trang /vendor/bookings thấy ngay!
        """
        tour_id = booking_data.get('tour_id')
        schedule_id = booking_data.get('schedule_id')
        adults = int(booking_data.get('adults_count', 1))
        children = int(booking_data.get('children_count', 0))
        total_guests = adults + children

        tour = cls.get_tour_detail(tour_id)
        if not tour:
            # Fallback lấy tour đầu tiên
            tour = cls._mock_tours[0]

        # Tìm Chuyến khởi hành
        target_schedule = None
        for sch in tour.get('schedules', []):
            if str(sch.get('id')) == str(schedule_id):
                target_schedule = sch
                break

        if not target_schedule and tour.get('schedules'):
            target_schedule = tour['schedules'][0]

        # Kiểm tra slot trống
        if target_schedule:
            if target_schedule.get('remaining_slots', 0) < total_guests:
                raise ValueError(f"Chuyến khởi hành chỉ còn {target_schedule.get('remaining_slots')} chỗ trống, không đủ cho đoàn {total_guests} khách!")

            # Cập nhật số chỗ
            target_schedule['booked_count'] += total_guests
            target_schedule['remaining_slots'] = max(0, target_schedule['max_capacity'] - target_schedule['booked_count'])
            if target_schedule['remaining_slots'] == 0:
                target_schedule['status'] = 'full'
                target_schedule['status_label'] = 'Đã đủ đoàn'
            elif target_schedule['remaining_slots'] <= 3:
                target_schedule['status'] = 'almost_full'
                target_schedule['status_label'] = f"Chỉ còn {target_schedule['remaining_slots']} chỗ"
            else:
                target_schedule['status_label'] = f"Còn {target_schedule['remaining_slots']} chỗ"

        # Tính toán giá vé & 10% Quỹ Bảo tồn Sơn Trà
        unit_price = target_schedule.get('price', tour.get('price', 450000)) if target_schedule else tour.get('price', 450000)
        adults_total = adults * unit_price
        children_total = int(children * unit_price * 0.7)
        grand_total = adults_total + children_total

        # 10% Quỹ ESG Sơn Trà
        esg_fund_contribution = int(grand_total * 0.10)
        vendor_payout = grand_total - esg_fund_contribution

        # Sinh mã đơn
        order_code = f"BK{random.randint(1025, 9999)}"

        departure_date = target_schedule.get('departure_date', '24/10/2026') if target_schedule else '24/10/2026'
        time_slot = target_schedule.get('time_slot', '06:00 - 10:30') if target_schedule else '06:00 - 10:30'

        new_booking_record = {
            'id': order_code,
            'order_code': order_code,
            'customer_name': booking_data.get('customer_name', 'Du Khách Sinh Thái'),
            'customer_phone': booking_data.get('customer_phone', '0905 123 456'),
            'customer_email': booking_data.get('customer_email', 'dukhach@gmail.com'),
            'pickup_location': booking_data.get('pickup_location', 'Đà Nẵng'),
            'experience_name': tour.get('title'),
            'tour_id': tour.get('id'),
            'schedule_id': target_schedule.get('id') if target_schedule else 'SCH-DEFAULT',
            'booking_date': departure_date,
            'time_slot': time_slot,
            'adults_count': adults,
            'children_count': children,
            'guests_label': f"{adults} người lớn{f', {children} trẻ em' if children > 0 else ''}",
            'total_price': grand_total,
            'total_price_formatted': f"{grand_total:,} đ".replace(',', '.'),
            'esg_fund_contribution': esg_fund_contribution,
            'esg_fund_formatted': f"{esg_fund_contribution:,} đ".replace(',', '.'),
            'vendor_payout': vendor_payout,
            'status': 'confirmed',
            'status_label': 'Đã xác nhận',
            'payment_status': 'paid',
            'payment_status_label': 'Đã thanh toán',
            'payment_method': booking_data.get('payment_method', 'Chuyển khoản QR VNPay'),
            'special_notes': booking_data.get('special_notes', 'Khách đặt trực tuyến qua website Sơn Trà REloop.'),
            'guide_name': target_schedule.get('guide_name', 'Nguyễn Tuấn Anh (Thẻ BQL #G08)') if target_schedule else 'Eco Guide BQL',
            'created_at': timezone.now().strftime('%d/%m/%Y %H:%M')
        }

        # Lưu thẳng vào VendorService._mock_bookings để trang /vendor/bookings nhận đơn tức thì!
        VendorService._mock_bookings.insert(0, new_booking_record)

        return new_booking_record

