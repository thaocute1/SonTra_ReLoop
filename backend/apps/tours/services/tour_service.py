from django.db import transaction
from django.db.models import F, Prefetch, Q
from django.utils import timezone
from django.utils.text import slugify
from decimal import Decimal
import random
import datetime

from apps.accounts.models.user_models import Users
from apps.vendors.models.vendor_models import Vendors, Guides
from ..models.tour_models import (
    BOOKABLE_SCHEDULE_STATUSES,
    Tours,
    Routes,
    Checkpoints,
    TourSchedules,
    TourParticipants,
    TourAttendanceLogs,
)
from apps.orders.models.order_models import Orders, OrderVendors, OrderItems
from apps.payments.models.payment_models import LedgerEntries
from .route_utils import calculate_total_route_distance
from .review_helpers import (
    parse_review_payload,
    build_review_images_payload,
    mask_customer_name,
    needs_manual_review,
    compute_bayesian_score,
    compute_top_tags,
    guide_review_summary,
)


class TourService:
    """
    Tầng xử lý nghiệp vụ Quản lý Tour Trekking, Lịch Khởi Hành & Đặt Chỗ
    100% dữ liệu được truy vấn và ghi nhận vào PostgreSQL Database
    """

    @staticmethod
    def _validate_departure_time(departure_date, start_time):
        try:
            start_time = datetime.time.fromisoformat(str(start_time))
        except ValueError as exc:
            raise ValueError('Giờ khởi hành không hợp lệ.') from exc
        if start_time.tzinfo is not None:
            raise ValueError('Vui lòng nhập giờ khởi hành theo giờ địa phương.')
        local_now = timezone.localtime()
        if (departure_date, start_time) <= (local_now.date(), local_now.time()):
            raise ValueError('Lịch này đã qua giờ khởi hành. Vui lòng chọn ngày giờ trong tương lai.')

    @staticmethod
    def _upcoming_schedules():
        local_now = timezone.localtime()
        return TourSchedules.objects.filter(
            Q(departure_date__gt=local_now.date())
            | Q(departure_date=local_now.date(), start_time__gt=local_now.time())
        ).select_related('guide__user').order_by('departure_date', 'start_time')

    @classmethod
    def _tours_with_relations(cls):
        """Return a Tours queryset with vendor, route, checkpoints, and upcoming schedules prefetched."""
        return Tours.objects.select_related('vendor', 'routes').prefetch_related(
            Prefetch(
                'routes__checkpoints',
                queryset=Checkpoints.objects.order_by('order_index'),
                to_attr='prefetched_checkpoints',
            ),
            Prefetch(
                'schedules',
                queryset=cls._upcoming_schedules(),
                to_attr='prefetched_upcoming_schedules',
            ),
        )

    @classmethod
    def _format_tour_from_db(cls, tour_obj):
        """
        Format đối tượng Django Tours sang cấu trúc dict chuẩn cho API & UI
        """
        diff_labels = {
            'easy': 'Dễ',
            'moderate': 'Trung bình',
            'challenging': 'Thử thách',
            'expert': 'Chuyên gia'
        }

        # Checkpoints & Tuyến đường
        route_data = {}
        checkpoints_data = []
        coordinates = []

        route_rel = getattr(tour_obj, 'routes', None)
        if route_rel:
            cps = getattr(route_rel, 'prefetched_checkpoints', None)
            if cps is None:
                cps = Checkpoints.objects.filter(route=route_rel).order_by('order_index')
            for cp in cps:
                lat = float(cp.latitude)
                lng = float(cp.longitude)
                checkpoints_data.append({
                    'id': cp.id,
                    'order_index': cp.order_index,
                    'name': cp.name,
                    'lat': lat,
                    'lng': lng,
                    'radius_tolerance_m': cp.radius_tolerance_m,
                    'type': 'finish_checkpoint' if cp.is_final else ('start_checkpoint' if cp.order_index == 1 else 'checkpoint'),
                    'desc': cp.description or ''
                })
                coordinates.append([lat, lng])

            start_name = checkpoints_data[0]['name'] if checkpoints_data else 'Sơn Trà'
            end_name = checkpoints_data[-1]['name'] if checkpoints_data else 'Đỉnh Bàn Cờ'

            if not coordinates:
                coordinates = [
                    [float(route_rel.start_latitude), float(route_rel.start_longitude)],
                    [float(route_rel.end_latitude), float(route_rel.end_longitude)]
                ]

            route_data = {
                'id': route_rel.id,
                'start_point': start_name,
                'end_point': end_name,
                'total_distance_km': float(route_rel.total_distance_km),
                'elevation_gain_m': route_rel.elevation_gain_m or 0,
                'coordinates': coordinates
            }

        # Lấy lịch khởi hành thực tế từ bảng tour_schedules trong PostgreSQL
        schedules = []
        try:
            sch_qs = getattr(tour_obj, 'prefetched_upcoming_schedules', None)
            if sch_qs is None:
                sch_qs = cls._upcoming_schedules().filter(tour=tour_obj)
            for sch in sch_qs:
                schedules.append({
                    'id': str(sch.id),
                    'tour_id': tour_obj.id,
                    'departure_date': sch.departure_date.strftime('%Y-%m-%d'),
                    'formatted_date': sch.departure_date.strftime('%d/%m/%Y'),
                    'start_time': str(sch.start_time),
                    'end_time': str(sch.end_time),
                    'time_slot': f"{str(sch.start_time)[:5]} - {str(sch.end_time)[:5]}",
                    'remaining_slots': sch.remaining_slots,
                    'max_capacity': sch.max_capacity,
                    'booked_count': sch.booked_count,
                    'price': int(sch.price if sch.price is not None else tour_obj.price),
                    'price_formatted': f"{int(sch.price if sch.price is not None else tour_obj.price):,} đ".replace(',', '.'),
                    'status': sch.status,
                    'status_label': f"Còn {sch.remaining_slots} chỗ trống" if sch.remaining_slots > 0 else "Đã đủ đoàn",
                    'guide_id': sch.guide_id,
                    'guide_name': sch.guide.user.name if sch.guide_id else None,
                    'special_notes': sch.special_notes or ''
                })
        except Exception as e:
            print(f"Error loading schedules from DB for tour {tour_obj.id}:", e)

        t_reviews = int(tour_obj.total_reviews or 0)
        t_avg = float(tour_obj.avg_rating) if t_reviews > 0 else 0.0
        return {
            'id': tour_obj.id,
            'title': tour_obj.title,
            'slug': tour_obj.slug,
            'description': tour_obj.description or '',
            'cover_image_url': tour_obj.cover_image_url or 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
            'images': tour_obj.images or [],
            'price': int(tour_obj.price),
            'price_formatted': f"{int(tour_obj.price):,} đ".replace(',', '.'),
            'max_capacity': tour_obj.max_capacity,
            'difficulty_level': tour_obj.difficulty_level,
            'difficulty_label': diff_labels.get(tour_obj.difficulty_level, 'Trung bình'),
            'duration_hours': float(tour_obj.duration_hours),
            'avg_rating': t_avg,
            'total_reviews': t_reviews,
            'bayesian_score': compute_bayesian_score(t_avg * t_reviews, t_reviews),
            'status': tour_obj.status,
            'vendor_id': tour_obj.vendor_id,
            'vendor_name': tour_obj.vendor.brand_name if getattr(tour_obj, 'vendor', None) else 'Sơn Trà Trekking',
            'esg_fund_percent': 10,
            'route': route_data,
            'checkpoints': checkpoints_data,
            'schedules': schedules
        }

    @classmethod
    def get_published_tours(cls, difficulty=None, search=None):
        """
        Lấy danh sách các tour đã xuất bản trực tiếp từ PostgreSQL database
        """
        all_tours = []
        from django.db.models import Q
        qs = cls._tours_with_relations().filter(status='published', deleted_at__isnull=True).order_by('-id')
        if difficulty and difficulty != 'all':
            qs = qs.filter(difficulty_level=difficulty)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        for t in qs:
            all_tours.append(cls._format_tour_from_db(t))

        # Gắn thông tin chuyến khởi hành kế tiếp
        for tour in all_tours:
            open_schedules = [
                sch for sch in tour.get('schedules', [])
                if sch.get('status') in BOOKABLE_SCHEDULE_STATUSES and sch.get('remaining_slots', 0) > 0
            ]
            if open_schedules:
                nearest = open_schedules[0]
                tour['_next_departure'] = f"{nearest['formatted_date']} ({nearest['time_slot']})"
                tour['_available_slots'] = nearest['remaining_slots']
            else:
                tour['_next_departure'] = 'Chưa có lịch còn chỗ'
                tour['_available_slots'] = 0

        return all_tours

    @classmethod
    def get_tours_by_health_filter(cls, query=None, difficulties=None, max_distance_km=None, limit=5):
        """
        Query tour đã publish theo filter do agent đề xuất (sức khỏe / khoảng cách).

        Chỉ được gọi từ tour_adapter của agent pipeline — không từ views/serializers.
        Trả projection tối giản cho agent: không có dữ liệu vendor nội bộ, không có PII.
        """
        allowed_values = {"easy", "moderate", "challenging", "expert"}
        safe_difficulties = [d for d in (difficulties or []) if d in allowed_values]

        try:
            safe_limit = max(1, min(int(limit), 20))
        except (TypeError, ValueError):
            safe_limit = 5

        qs = Tours.objects.filter(status="published", deleted_at__isnull=True)

        if safe_difficulties:
            qs = qs.filter(difficulty_level__in=safe_difficulties)

        if query:
            from django.db.models import Q
            needle = str(query)[:200]
            qs = qs.filter(Q(title__icontains=needle) | Q(description__icontains=needle))

        if max_distance_km is not None:
            # Lọc theo tổng khoảng cách của tuyến (bảng routes, quan hệ 1-1).
            qs = qs.filter(routes__total_distance_km__lte=max_distance_km)

        from django.db.models import Case, IntegerField, Value, When
        qs = qs.select_related("routes").annotate(
            _quality_penalty=Case(
                When(total_reviews__gte=3, avg_rating__lt=Decimal("3.50"), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by("_quality_penalty", "-avg_rating", "id")
        return [cls._format_tour_for_agent(t) for t in qs[:safe_limit]]

    @classmethod
    def get_tours_by_difficulties(cls, difficulties, search=None, limit=5):
        """Danh sách tour published theo nhiều mức difficulty (rule-based health tool)."""
        return cls.get_tours_by_health_filter(
            query=search,
            difficulties=difficulties,
            max_distance_km=None,
            limit=limit,
        )

    @classmethod
    def _format_tour_for_agent(cls, tour_obj):
        """Projection tối giản cho agent — chỉ dữ liệu catalog công khai."""
        price = getattr(tour_obj, "price", None)
        duration = getattr(tour_obj, "duration_hours", None)
        rating = getattr(tour_obj, "avg_rating", None)
        description = getattr(tour_obj, "description", None)
        return {
            "id": tour_obj.id,
            "title": tour_obj.title,
            "description": description[:400] if description else None,
            "cover_image_url": getattr(tour_obj, "cover_image_url", None),
            "price": str(price) if price is not None else None,
            "difficulty_level": getattr(tour_obj, "difficulty_level", None),
            "duration_hours": str(duration) if duration else None,
            "avg_rating": str(rating) if rating else None,
        }

    @classmethod
    def get_tour_detail(cls, tour_id):
        """
        Lấy chi tiết tour trực tiếp từ PostgreSQL database
        """
        tour_obj = None
        if str(tour_id).isdigit():
            tour_obj = cls._tours_with_relations().filter(id=int(tour_id), deleted_at__isnull=True).first()
        if not tour_obj:
            tour_obj = cls._tours_with_relations().filter(slug=str(tour_id), deleted_at__isnull=True).first()
        if tour_obj:
            return cls._format_tour_from_db(tour_obj)

        return None

    @classmethod
    def get_tour_route_map(cls, tour_id):
        tour = cls.get_tour_detail(tour_id)
        if not tour:
            return None

        route = tour.get('route', {})
        checkpoints = tour.get('checkpoints', [])

        coordinates = route.get('coordinates', [])
        if not coordinates:
            for cp in checkpoints:
                if 'lat' in cp and 'lng' in cp:
                    coordinates.append([float(cp['lat']), float(cp['lng'])])

        if not coordinates:
            coordinates = [[16.1018, 108.2530], [16.1215, 108.2810]]

        return {
            'tour_id': tour.get('id'),
            'title': tour.get('title'),
            'start_point': route.get('start_point', ''),
            'end_point': route.get('end_point', ''),
            'total_distance_km': float(route.get('total_distance_km', 0.0)),
            'elevation_gain_m': int(route.get('elevation_gain_m', 0)),
            'coordinates': coordinates,
            'checkpoints': checkpoints
        }

    @classmethod
    def get_vendor_tours(cls, vendor_id=None):
        """
        Lấy danh sách các tour thuộc sở hữu của Vendor trực tiếp từ PostgreSQL database
        """
        results = []
        try:
            qs = cls._tours_with_relations().filter(deleted_at__isnull=True)
            if vendor_id:
                try:
                    qs = qs.filter(vendor_id=int(vendor_id))
                except (ValueError, TypeError):
                    pass
            qs = qs.order_by('-id')
            for tour in qs:
                data = cls._format_tour_from_db(tour)
                data['rejection_reason'] = tour.rejection_reason or ''
                results.append(data)
        except Exception as e:
            print("Error loading vendor tours from DB:", e)

        return results

    @classmethod
    def create_vendor_tour(cls, vendor_id, data):
        """
        Vendor tạo trải nghiệm trekking mới:
        1. Tạo thông tin cơ bản & ghi vào bảng Tours (PostgreSQL)
        2. Tạo bản ghi Routes (start/end GPS, cự ly, độ cao)
        3. Tạo danh sách Checkpoints tương ứng
        4. Tạo TourSchedules trong CSDL nếu có truyền initial_schedule
        """
        import time
        title = data.get('title', 'Trekking Sơn Trà Mới')
        timestamp_suffix = int(time.time())
        slug = f"{slugify(title) or 'trekking-son-tra'}-{timestamp_suffix}"

        price = int(data.get('price', 450000))
        max_capacity = int(data.get('max_capacity', 15))
        duration_hours = float(data.get('duration_hours', 4.0))

        diff = data.get('difficulty_level', 'moderate')
        if diff not in ['easy', 'moderate', 'challenging', 'expert']:
            diff = 'moderate'

        # Checkpoints & Tọa độ bản đồ
        raw_cps = data.get('checkpoints', [])
        checkpoints = []
        coordinates = []
        if raw_cps:
            for idx, cp in enumerate(raw_cps, start=1):
                lat = float(cp.get('lat', 16.1042 + idx * 0.005))
                lng = float(cp.get('lng', 108.2543 + idx * 0.005))
                name = cp.get('name', f'Trạm {idx}')
                radius = int(cp.get('radius_tolerance_m', cp.get('radius_m', 30)))
                checkpoints.append({
                    'order_index': idx,
                    'name': name,
                    'lat': lat,
                    'lng': lng,
                    'radius_tolerance_m': radius,
                    'type': 'finish_checkpoint' if idx == len(raw_cps) else ('start_checkpoint' if idx == 1 else 'checkpoint'),
                    'desc': cp.get('desc', f'Trạm kiểm soát GPS #{idx}')
                })
                coordinates.append([lat, lng])
        else:
            checkpoints = [
                {'order_index': 1, 'name': 'Điểm Tập Kết Xuất Phát', 'lat': 16.1042, 'lng': 108.2543, 'radius_tolerance_m': 30, 'type': 'checkpoint', 'desc': 'Kiểm tra trang thiết bị và điểm danh.'},
                {'order_index': 2, 'name': 'Đích Đến Hoàn Thành', 'lat': 16.1215, 'lng': 108.2789, 'radius_tolerance_m': 50, 'type': 'finish_checkpoint', 'desc': 'Check-in GPS trạm cuối.'}
            ]
            coordinates = [[16.1042, 108.2543], [16.1215, 108.2789]]

        # Tính toán cự ly thực tế
        calculated_km = calculate_total_route_distance([{'lat': c[0], 'lng': c[1]} for c in coordinates])
        total_distance = calculated_km if calculated_km > 0 else float(data.get('total_distance_km', 4.0))
        elevation_gain_m = int(data.get('elevation_gain_m', 200))

        # Tìm Vendor hợp lệ
        vendor = None
        if vendor_id:
            try:
                vendor = Vendors.objects.filter(id=int(vendor_id), deleted_at__isnull=True).first()
            except (ValueError, TypeError):
                vendor = None
        if not vendor:
            raise ValueError('Không tìm thấy hồ sơ đối tác hợp lệ.')

        # Lưu dữ liệu vào PostgreSQL bằng transaction.atomic()
        with transaction.atomic():
            tour_obj = Tours.objects.create(
                vendor=vendor,
                title=title,
                slug=slug,
                description=data.get('description', 'Trải nghiệm khám phá sinh thái bán đảo Sơn Trà.'),
                cover_image_url=data.get('cover_image_url', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80'),
                images=data.get('images', []),
                price=price,
                max_capacity=max_capacity,
                difficulty_level=diff,
                duration_hours=duration_hours,
                avg_rating=0.0,
                total_reviews=0,
                status='pending_approval'
            )

            start_lat = checkpoints[0]['lat'] if checkpoints else 16.1042
            start_lng = checkpoints[0]['lng'] if checkpoints else 108.2543
            end_lat = checkpoints[-1]['lat'] if checkpoints else 16.1215
            end_lng = checkpoints[-1]['lng'] if checkpoints else 108.2789

            route_obj = Routes.objects.create(
                tour=tour_obj,
                start_latitude=start_lat,
                start_longitude=start_lng,
                end_latitude=end_lat,
                end_longitude=end_lng,
                total_distance_km=round(total_distance, 2),
                elevation_gain_m=elevation_gain_m
            )

            for idx, cp in enumerate(checkpoints, start=1):
                Checkpoints.objects.create(
                    route=route_obj,
                    name=cp['name'],
                    description=cp.get('desc', ''),
                    latitude=cp['lat'],
                    longitude=cp['lng'],
                    radius_tolerance_m=int(cp.get('radius_tolerance_m', 30)),
                    min_dwell_seconds=0,
                    order_index=idx,
                    is_mandatory=True,
                    require_photo=False,
                    is_final=(idx == len(checkpoints)),
                    status='approved'
                )

            # Khởi tạo Chuyến Khởi Hành đầu tiên trong DB nếu có truyền
            initial_sched = data.get('initial_schedule', {})
            if initial_sched and initial_sched.get('departure_date'):
                dep_date_str = initial_sched.get('departure_date')
                try:
                    if '/' in str(dep_date_str):
                        parts = dep_date_str.split('/')
                        dep_date = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                    else:
                        dep_date = datetime.date.fromisoformat(str(dep_date_str))
                except (TypeError, ValueError, IndexError) as exc:
                    raise ValueError('Ngày khởi hành đầu tiên không hợp lệ.') from exc

                guide_obj = None
                guide_id = initial_sched.get('guide_id')
                if guide_id is not None:
                    try:
                        guide_obj = Guides.objects.filter(
                            id=int(guide_id),
                            vendor_id=vendor.id,
                            user__role='guide',
                            user__status='active',
                            user__deleted_at__isnull=True,
                        ).first()
                    except (TypeError, ValueError):
                        guide_obj = None
                    if guide_obj is None:
                        raise ValueError('Hướng dẫn viên phải đang hoạt động và thuộc đơn vị của bạn.')

                time_slot = initial_sched.get('time_slot', '06:00 - 10:30')
                if time_slot and ' - ' in str(time_slot):
                    start_time, end_time = [part.strip() for part in str(time_slot).split(' - ', 1)]
                else:
                    start_time, end_time = '06:00', '10:30'
                if len(start_time) == 5:
                    start_time = f'{start_time}:00'
                if len(end_time) == 5:
                    end_time = f'{end_time}:00'

                cls._validate_departure_time(dep_date, start_time)
                TourSchedules.objects.create(
                    tour=tour_obj,
                    guide=guide_obj,
                    departure_date=dep_date,
                    start_time=start_time,
                    end_time=end_time,
                    max_capacity=max_capacity,
                    booked_count=0,
                    price=price,
                    status='open',
                    special_notes='Chuyến khởi hành đầu tiên tạo bởi Đối Tác'
                )

        return cls._format_tour_from_db(tour_obj)

    @classmethod
    def update_vendor_tour(cls, vendor_id, tour_id, data):
        """
        Vendor cập nhật thông tin tour hoặc Tạm ngưng / Mở bán lại tour của đơn vị mình.
        """
        tour_obj = Tours.objects.filter(
            id=int(tour_id), vendor_id=int(vendor_id), deleted_at__isnull=True
        ).first()
        if not tour_obj:
            return None

        action = (data.get('action') or '').strip().lower()
        with transaction.atomic():
            if action in ('suspend', 'pause'):
                if tour_obj.status != 'published':
                    raise ValueError('Chỉ có thể tạm ngưng tour đã được BQL phê duyệt và đang mở bán.')
                tour_obj.status = 'suspended'
                tour_obj.suspended_at = timezone.now()
                tour_obj.suspended_reason = str(
                    data.get('suspended_reason') or 'Đối tác tạm ngưng nhận khách mới'
                ).strip()[:500]
                tour_obj.save(update_fields=['status', 'suspended_at', 'suspended_reason', 'updated_at'])
                return cls.get_tour_detail(tour_obj.id)

            if action in ('resume', 'reopen'):
                if tour_obj.status != 'suspended':
                    raise ValueError('Tour này hiện không ở trạng thái tạm ngưng.')
                if getattr(tour_obj, 'suspended_by_admin_id', None):
                    raise ValueError('Tour đang bị Ban Quản Lý tạm ngưng kiểm tra, vui lòng liên hệ BQL để mở lại.')
                tour_obj.status = 'published'
                tour_obj.suspended_at = None
                tour_obj.suspended_reason = ''
                tour_obj.save(update_fields=['status', 'suspended_at', 'suspended_reason', 'updated_at'])
                return cls.get_tour_detail(tour_obj.id)

            if 'title' in data and str(data['title']).strip():
                tour_obj.title = str(data['title']).strip()[:255]
            if 'description' in data:
                tour_obj.description = str(data.get('description') or '').strip()
            if 'price' in data and data['price'] is not None:
                price_val = int(Decimal(str(data['price'])))
                if price_val < 1000:
                    raise ValueError('Giá tour phải lớn hơn hoặc bằng 1.000 đ.')
                tour_obj.price = Decimal(price_val)
            if 'max_capacity' in data and data['max_capacity'] is not None:
                cap = int(data['max_capacity'])
                if cap < 1 or cap > 100:
                    raise ValueError('Sức chứa tối đa phải từ 1 đến 100 khách.')
                tour_obj.max_capacity = cap
            if 'duration_hours' in data and data['duration_hours'] is not None:
                dur = float(data['duration_hours'])
                if dur <= 0:
                    raise ValueError('Thời lượng tour phải lớn hơn 0 giờ.')
                tour_obj.duration_hours = Decimal(str(round(dur, 2)))
            if 'difficulty_level' in data and data['difficulty_level'] in ('easy', 'moderate', 'challenging', 'expert'):
                tour_obj.difficulty_level = data['difficulty_level']
            if 'cover_image_url' in data and data['cover_image_url']:
                tour_obj.cover_image_url = str(data['cover_image_url']).strip()

            # Nếu tour từng bị từ chối và đối tác chỉnh sửa lại -> đưa về hàng đợi chờ duyệt lại
            if tour_obj.status == 'rejected':
                tour_obj.status = 'pending_approval'
                tour_obj.rejection_reason = ''

            tour_obj.save()

            if 'elevation_gain_m' in data or 'total_distance_km' in data:
                route_obj = Routes.objects.filter(tour=tour_obj).first()
                if route_obj:
                    if data.get('elevation_gain_m') is not None:
                        route_obj.elevation_gain_m = int(data['elevation_gain_m'])
                    if data.get('total_distance_km') is not None:
                        route_obj.total_distance_km = Decimal(str(round(float(data['total_distance_km']), 2)))
                    route_obj.save()

        return cls.get_tour_detail(tour_obj.id)

    @classmethod
    def delete_vendor_tour(cls, vendor_id, tour_id):
        """
        Theo chuẩn sàn OTA: Tour đã từng mở bán hoặc đã phát sinh đơn hàng không được phép xóa
        mà phải dùng tính năng Tạm ngưng nhận khách (suspend). Chỉ cho rút/xóa hồ sơ chưa mở bán và chưa có đơn.
        """
        tour_obj = Tours.objects.filter(
            id=int(tour_id), vendor_id=int(vendor_id), deleted_at__isnull=True
        ).first()
        if not tour_obj:
            return None

        has_any_booking = OrderItems.objects.filter(tour=tour_obj).exists()
        if tour_obj.status in ('published', 'suspended') or has_any_booking:
            raise ValueError(
                'Tour đã mở bán hoặc đã có lịch sử đặt chỗ của khách không thể xóa. '
                'Vui lòng sử dụng nút "Tạm ngưng" để ngừng nhận khách mới.'
            )

        tour_obj.deleted_at = timezone.now()
        tour_obj.status = 'archived'
        tour_obj.save(update_fields=['deleted_at', 'status', 'updated_at'])
        return {'id': tour_obj.id, 'deleted': True}

    @classmethod
    def complete_customer_booking(cls, customer, booking_id):
        """
        Du khách xác nhận đã hoàn thành chuyến đi thực tế để mở khóa tính năng đánh giá tour.
        """
        if not customer or not getattr(customer, 'is_authenticated', False):
            raise ValueError('Vui lòng đăng nhập để thực hiện thao tác này.')

        with transaction.atomic():
            ov = (
                OrderVendors.objects.select_for_update()
                .select_related('order')
                .filter(id=int(booking_id), order__customer=customer)
                .first()
            )
            if not ov:
                raise ValueError('Không tìm thấy đơn đặt chỗ của bạn.')
            if ov.status == 'cancelled':
                raise ValueError('Không thể hoàn thành đơn đặt chỗ đã hủy.')
            if ov.status != 'completed':
                if ov.status != 'confirmed' and ov.order.payment_status != 'paid':
                    raise ValueError('Chỉ có thể xác nhận hoàn thành đối với đơn đã xác nhận / thanh toán.')
                ov.status = 'completed'
                ov.save(update_fields=['status', 'updated_at'])

        return {
            'id': ov.id,
            'status': 'completed',
            'status_label': 'Hoàn thành',
        }

    @staticmethod
    def _extract_review_images_and_reply(raw_images):
        photos, vendor_reply, replied_at, _ = parse_review_payload(raw_images)
        return photos, vendor_reply, replied_at

    @staticmethod
    def _resolve_booking_guide(order_vendor, tour_obj):
        if getattr(order_vendor, 'guide', None):
            return order_vendor.guide
        for item in OrderItems.objects.filter(order_vendor=order_vendor, tour=tour_obj).select_related('tour_schedule__guide__user'):
            if item.tour_schedule and item.tour_schedule.guide:
                return item.tour_schedule.guide
        if getattr(order_vendor, 'scheduled_date', None):
            sch = (
                TourSchedules.objects.filter(
                    tour=tour_obj,
                    departure_date=order_vendor.scheduled_date,
                    guide__isnull=False,
                )
                .select_related('guide__user')
                .first()
            )
            if sch and sch.guide:
                return sch.guide
        return None

    @staticmethod
    def _is_absent_no_show(order_vendor):
        statuses = list(
            TourAttendanceLogs.objects.filter(
                participant__order_item__order_vendor=order_vendor,
                attendance_stage='departure',
            ).values_list('participant_status', flat=True)
        )
        if not statuses:
            return False
        return 'absent' in statuses and not any(s in {'present', 'late'} for s in statuses)

    @staticmethod
    def _review_deadline_info(order_vendor):
        sched_date = getattr(order_vendor, 'scheduled_date', None)
        if not sched_date:
            return False, None, 14
        deadline_date = sched_date + datetime.timedelta(days=14)
        today = timezone.localdate()
        is_expired = today > deadline_date
        days_remaining = max(0, (deadline_date - today).days)
        return is_expired, deadline_date.strftime('%d/%m/%Y'), days_remaining

    @classmethod
    def _sync_vendor_and_guide_ratings(cls, vendor_id, guide_id=None):
        from django.db.models import Avg, Count
        from apps.gamification.models.gamification_models import Reviews
        from apps.vendors.models import Vendors, Guides

        if vendor_id:
            v_agg = Reviews.objects.filter(vendor_id=vendor_id, status='approved').aggregate(
                avg=Avg('rating'), cnt=Count('id')
            )
            v_cnt = int(v_agg['cnt'] or 0)
            v_avg = Decimal(str(round(float(v_agg['avg'] or 0), 2))) if v_cnt > 0 else Decimal('0.00')
            Vendors.objects.filter(id=vendor_id).update(
                avg_rating=v_avg,
                total_reviews=v_cnt,
                updated_at=timezone.now(),
            )
        if guide_id:
            summary = guide_review_summary(guide_id)
            g_cnt = int(summary['total_reviews'] or 0)
            g_avg = Decimal(str(round(float(summary['avg_rating'] or 0), 2))) if g_cnt > 0 else Decimal('0.00')
            Guides.objects.filter(id=guide_id).update(
                avg_rating=g_avg,
                updated_at=timezone.now(),
            )

    @classmethod
    def get_tour_reviews(cls, tour_id, rating_filter=None, customer=None):
        """
        Danh sách đánh giá đã duyệt của du khách cho tour kèm điểm Tour, điểm HDV, tag và hạn đánh giá.
        """
        from apps.gamification.models.gamification_models import Reviews
        tour_obj = Tours.objects.select_related('vendor').filter(id=int(tour_id), deleted_at__isnull=True).first()
        if not tour_obj:
            return None

        qs = (
            Reviews.objects.filter(tour=tour_obj, status='approved')
            .select_related('customer', 'vendor', 'guide__user')
            .order_by('-created_at', '-id')
        )
        all_reviews = list(qs)
        rating_breakdown = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
        rating_sum = 0
        tag_lists = []
        for rev in all_reviews:
            r_val = max(1, min(5, int(rev.rating or 5)))
            rating_breakdown[str(r_val)] += 1
            rating_sum += r_val
            _, _, _, meta = parse_review_payload(rev.images)
            if meta.get('tour_tags'):
                tag_lists.append(meta['tour_tags'])

        total_count = len(all_reviews)
        computed_avg = round(rating_sum / total_count, 2) if total_count > 0 else 0.0
        bayesian_score = compute_bayesian_score(rating_sum, total_count)

        filter_star = None
        if rating_filter is not None and str(rating_filter).isdigit():
            parsed_star = int(rating_filter)
            if 1 <= parsed_star <= 5:
                filter_star = parsed_star

        items = []
        for rev in all_reviews:
            r_val = int(rev.rating or 5)
            if filter_star is not None and r_val != filter_star:
                continue
            photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            cust_name = mask_customer_name(rev.customer.name if rev.customer else '')
            items.append({
                'id': rev.id,
                'tour_id': rev.tour_id,
                'customer_name': cust_name,
                'rating': r_val,
                'tour_rating': r_val,
                'guide_rating': meta.get('guide_rating'),
                'guide_id': rev.guide_id,
                'guide_name': rev.guide.user.name if (rev.guide and getattr(rev.guide, 'user', None)) else None,
                'tour_tags': meta.get('tour_tags') or [],
                'guide_tags': meta.get('guide_tags') or [],
                'low_rating_reasons': meta.get('low_rating_reasons') or [],
                'edited_at': meta.get('edited_at'),
                'comment': rev.comment or '',
                'images': photos,
                'vendor_reply': vendor_reply,
                'replied_at': replied_at,
                'vendor_name': tour_obj.vendor.brand_name if getattr(tour_obj, 'vendor', None) else 'Đơn vị tổ chức',
                'created_at': rev.created_at.strftime('%d/%m/%Y') if rev.created_at else '',
            })

        user_review_state = {
            'can_review': False,
            'can_complete_and_review': False,
            'order_vendor_id': None,
            'booking_status': None,
            'has_reviewed': False,
            'is_absent_blocked': False,
            'is_expired': False,
            'deadline': None,
            'days_remaining': None,
            'has_guide': False,
            'guide_id': None,
            'guide_name': None,
            'guide_avatar_url': None,
            'editable_review': None,
        }
        if customer and getattr(customer, 'is_authenticated', False):
            cust_ovs = list(
                OrderVendors.objects.filter(
                    order__customer=customer,
                    orderitems__tour=tour_obj,
                )
                .exclude(status='cancelled')
                .distinct()
                .order_by('-id')
            )
            if cust_ovs:
                existing_reviews = list(
                    Reviews.objects.filter(order_vendor__in=cust_ovs, tour=tour_obj)
                    .select_related('guide__user')
                    .order_by('-created_at', '-id')
                )
                reviewed_ov_ids = {r.order_vendor_id for r in existing_reviews}
                user_review_state['has_reviewed'] = bool(reviewed_ov_ids)

                # Cho phép chỉnh sửa 1 lần trong 48h đối với review mới nhất của chính user
                if existing_reviews:
                    latest_rev = existing_reviews[0]
                    _, _, _, l_meta = parse_review_payload(latest_rev.images)
                    within_48h = bool(
                        latest_rev.created_at
                        and (timezone.now() - latest_rev.created_at) <= datetime.timedelta(hours=48)
                    )
                    if not l_meta.get('edited_at') and within_48h:
                        user_review_state['editable_review'] = {
                            'id': latest_rev.id,
                            'rating': int(latest_rev.rating or 5),
                            'tour_rating': int(latest_rev.rating or 5),
                            'guide_rating': l_meta.get('guide_rating'),
                            'comment': latest_rev.comment or '',
                            'tour_tags': l_meta.get('tour_tags') or [],
                            'guide_tags': l_meta.get('guide_tags') or [],
                            'low_rating_reasons': l_meta.get('low_rating_reasons') or [],
                            'has_guide': bool(latest_rev.guide_id),
                            'guide_id': latest_rev.guide_id,
                            'guide_name': (
                                latest_rev.guide.user.name
                                if (latest_rev.guide and getattr(latest_rev.guide, 'user', None))
                                else None
                            ),
                        }

                unreviewed_completed = [
                    ov for ov in cust_ovs if ov.status == 'completed' and ov.id not in reviewed_ov_ids
                ]
                eligible_ov = None
                absent_found = False
                expired_found = False
                last_deadline = None
                for ov in unreviewed_completed:
                    if cls._is_absent_no_show(ov):
                        absent_found = True
                        continue
                    is_exp, dl_str, days_rem = cls._review_deadline_info(ov)
                    last_deadline = dl_str
                    if is_exp:
                        expired_found = True
                        continue
                    eligible_ov = ov
                    user_review_state['deadline'] = dl_str
                    user_review_state['days_remaining'] = days_rem
                    break

                completable_ov = next(
                    (ov for ov in cust_ovs if ov.status == 'confirmed' and ov.id not in reviewed_ov_ids),
                    None,
                )
                target_for_guide = eligible_ov or completable_ov
                if target_for_guide:
                    resolved_guide = cls._resolve_booking_guide(target_for_guide, tour_obj)
                    if resolved_guide and getattr(resolved_guide, 'user', None):
                        user_review_state['has_guide'] = True
                        user_review_state['guide_id'] = resolved_guide.id
                        user_review_state['guide_name'] = resolved_guide.user.name
                        user_review_state['guide_avatar_url'] = getattr(resolved_guide.user, 'avatar_url', None)

                if eligible_ov:
                    user_review_state.update({
                        'can_review': True,
                        'order_vendor_id': eligible_ov.id,
                        'booking_status': 'completed',
                    })
                elif completable_ov:
                    is_exp, dl_str, days_rem = cls._review_deadline_info(completable_ov)
                    user_review_state.update({
                        'can_complete_and_review': not is_exp,
                        'order_vendor_id': completable_ov.id,
                        'booking_status': 'confirmed',
                        'is_expired': is_exp,
                        'deadline': dl_str,
                        'days_remaining': days_rem,
                    })
                elif absent_found:
                    user_review_state['is_absent_blocked'] = True
                elif expired_found:
                    user_review_state['is_expired'] = True
                    user_review_state['deadline'] = last_deadline
                    user_review_state['days_remaining'] = 0

        next_review_points = 20 if total_count < 3 else 10
        return {
            'tour_id': tour_obj.id,
            'avg_rating': computed_avg if total_count > 0 else 0.0,
            'bayesian_score': bayesian_score,
            'total_reviews': total_count,
            'next_review_points': next_review_points,
            'is_early_review_bonus': total_count < 3,
            'rating_breakdown': rating_breakdown,
            'top_tags': compute_top_tags(tag_lists, limit=5),
            'user_review_state': user_review_state,
            'results': items,
        }

    @classmethod
    def create_tour_review(cls, customer, tour_id, data):
        """
        Du khách đã hoàn thành chuyến đi gửi đánh giá tách riêng Tour + HDV (KH-07).
        """
        from django.db.models import Avg, Count
        from apps.gamification.models.gamification_models import Reviews

        if not customer or not getattr(customer, 'is_authenticated', False):
            raise ValueError('Vui lòng đăng nhập để đánh giá chuyến đi.')

        tour_obj = Tours.objects.filter(id=int(tour_id), deleted_at__isnull=True).first()
        if not tour_obj:
            raise ValueError('Không tìm thấy trải nghiệm trekking cần đánh giá.')

        raw_tour_rating = data.get('tour_rating') if data.get('tour_rating') is not None else data.get('rating')
        try:
            rating = int(raw_tour_rating)
        except (TypeError, ValueError):
            raise ValueError('Số sao đánh giá tour phải từ 1 đến 5.')
        if rating < 1 or rating > 5:
            raise ValueError('Số sao đánh giá tour phải từ 1 đến 5.')

        comment = str(data.get('comment') or '').strip()
        if len(comment) < 10:
            raise ValueError('Vui lòng nhập nhận xét tối thiểu 10 ký tự.')

        order_vendor_id = data.get('order_vendor_id')
        base_customer_qs = OrderVendors.objects.filter(
            order__customer=customer,
            orderitems__tour=tour_obj,
        ).distinct()
        if order_vendor_id and str(order_vendor_id).isdigit():
            base_customer_qs = base_customer_qs.filter(id=int(order_vendor_id))

        eligible_qs = base_customer_qs.filter(status='completed')

        target_ov = None
        for ov in eligible_qs.order_by('-id'):
            if not Reviews.objects.filter(order_vendor=ov, tour=tour_obj).exists():
                target_ov = ov
                break

        if not target_ov:
            if eligible_qs.exists():
                raise ValueError('Bạn đã gửi đánh giá cho chuyến đi này rồi.')
            if base_customer_qs.exclude(status='cancelled').exists():
                raise ValueError('Bạn cần hoàn thành chuyến đi trước khi gửi đánh giá trải nghiệm.')
            raise ValueError('Chỉ du khách đã hoàn thành chuyến đi này mới có thể gửi đánh giá.')

        if cls._is_absent_no_show(target_ov):
            raise ValueError('Đơn đặt được ghi nhận vắng mặt (không tham gia chuyến đi) nên không thể gửi đánh giá.')

        is_expired, deadline_str, _ = cls._review_deadline_info(target_ov)
        if is_expired:
            raise ValueError(f'Đã quá thời hạn 14 ngày để đánh giá chuyến đi này (hạn cuối {deadline_str}).')

        resolved_guide = cls._resolve_booking_guide(target_ov, tour_obj)
        guide_rating = None
        if resolved_guide is not None:
            raw_guide_rating = data.get('guide_rating')
            if raw_guide_rating is None or str(raw_guide_rating).strip() == '':
                raise ValueError('Vui lòng chấm điểm 1–5 sao cho Hướng dẫn viên phụ trách chuyến đi.')
            try:
                guide_rating = int(raw_guide_rating)
            except (TypeError, ValueError):
                raise ValueError('Số sao đánh giá Hướng dẫn viên phải từ 1 đến 5.')
            if guide_rating < 1 or guide_rating > 5:
                raise ValueError('Số sao đánh giá Hướng dẫn viên phải từ 1 đến 5.')

        tour_tags = [str(t).strip() for t in (data.get('tour_tags') or []) if str(t).strip()][:8]
        guide_tags = [str(t).strip() for t in (data.get('guide_tags') or []) if str(t).strip()][:8]
        low_reasons = [str(t).strip() for t in (data.get('low_rating_reasons') or []) if str(t).strip()][:6]

        clean_images = [
            str(img).strip()
            for img in (data.get('images') if isinstance(data.get('images'), list) else [])
            if isinstance(img, str) and str(img).strip()
        ][:5]

        rev_status = 'pending_approval' if needs_manual_review(comment) else 'approved'
        meta = {
            'guide_rating': guide_rating,
            'tour_tags': tour_tags,
            'guide_tags': guide_tags,
            'low_rating_reasons': low_reasons,
            'edited_at': None,
            'reports': [],
        }
        stored_images = build_review_images_payload(clean_images, meta=meta)

        with transaction.atomic():
            locked_tour = Tours.objects.select_for_update().get(id=tour_obj.id)
            prior_reviews_count = Reviews.objects.filter(tour=locked_tour, status='approved').count()
            is_early_bonus = prior_reviews_count < 3
            points_awarded = (20 if is_early_bonus else 10) if rev_status == 'approved' else 0

            rev = Reviews.objects.create(
                customer=customer,
                order_vendor=target_ov,
                tour=locked_tour,
                vendor=locked_tour.vendor,
                guide=resolved_guide,
                rating=rating,
                comment=comment[:2000],
                images=stored_images,
                status=rev_status,
            )

            if rev_status == 'approved':
                agg = Reviews.objects.filter(tour=locked_tour, status='approved').aggregate(
                    avg=Avg('rating'), cnt=Count('id')
                )
                locked_tour.avg_rating = Decimal(str(round(float(agg['avg'] or rating), 2)))
                locked_tour.total_reviews = int(agg['cnt'] or 1)
                locked_tour.save(update_fields=['avg_rating', 'total_reviews', 'updated_at'])

                cls._sync_vendor_and_guide_ratings(
                    locked_tour.vendor_id,
                    resolved_guide.id if resolved_guide else None,
                )

                from apps.gamification.models.gamification_models import PointsLedger
                reward_prefix = "Thưởng mở hàng đánh giá (+20)" if is_early_bonus else "Thưởng đánh giá hành trình"
                PointsLedger.objects.create(
                    user=customer,
                    vendor=None,
                    points_change=points_awarded,
                    reason=f"{reward_prefix}: {locked_tour.title[:80]}",
                    reference_type="tour_review_reward",
                    order_vendor=target_ov,
                )
                if hasattr(customer, 'refresh_from_db'):
                    try:
                        customer.refresh_from_db()
                    except Exception:
                        pass

        return {
            'id': rev.id,
            'tour_id': tour_obj.id,
            'order_vendor_id': target_ov.id,
            'customer_name': mask_customer_name(customer.name),
            'rating': int(rev.rating),
            'tour_rating': int(rev.rating),
            'guide_rating': guide_rating,
            'guide_id': resolved_guide.id if resolved_guide else None,
            'guide_name': (
                resolved_guide.user.name
                if (resolved_guide and getattr(resolved_guide, 'user', None))
                else None
            ),
            'tour_tags': tour_tags,
            'guide_tags': guide_tags,
            'low_rating_reasons': low_reasons,
            'comment': rev.comment,
            'images': clean_images,
            'status': rev_status,
            'vendor_reply': '',
            'replied_at': '',
            'avg_rating': float(locked_tour.avg_rating) if int(locked_tour.total_reviews or 0) > 0 else 0.0,
            'total_reviews': int(locked_tour.total_reviews or 0),
            'points_awarded': points_awarded,
            'is_early_reviewer_bonus': is_early_bonus and rev_status == 'approved',
            'new_total_points': int(getattr(customer, 'total_eco_points', 0) or 0),
            'created_at': rev.created_at.strftime('%d/%m/%Y') if rev.created_at else 'Hôm nay',
        }

    @classmethod
    def edit_tour_review(cls, customer, tour_id, review_id, data):
        """Khách hàng chỉnh sửa đánh giá 1 lần duy nhất trong vòng 48 giờ sau khi gửi."""
        from django.db.models import Avg, Count
        from apps.gamification.models.gamification_models import Reviews

        if not customer or not getattr(customer, 'is_authenticated', False):
            raise ValueError('Vui lòng đăng nhập để chỉnh sửa đánh giá.')

        with transaction.atomic():
            rev = (
                Reviews.objects.select_for_update()
                .filter(id=int(review_id), tour_id=int(tour_id), customer=customer)
                .first()
            )
            if not rev:
                return None

            photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            if meta.get('edited_at'):
                raise ValueError('Mỗi đánh giá chỉ được chỉnh sửa 1 lần duy nhất.')
            if not rev.created_at or (timezone.now() - rev.created_at) > datetime.timedelta(hours=48):
                raise ValueError('Đã quá thời hạn 48 giờ để chỉnh sửa đánh giá này.')

            raw_tour_rating = data.get('tour_rating') if data.get('tour_rating') is not None else data.get('rating')
            try:
                rating = int(raw_tour_rating)
            except (TypeError, ValueError):
                raise ValueError('Số sao đánh giá tour phải từ 1 đến 5.')
            if rating < 1 or rating > 5:
                raise ValueError('Số sao đánh giá tour phải từ 1 đến 5.')

            comment = str(data.get('comment') or '').strip()
            if len(comment) < 10:
                raise ValueError('Vui lòng nhập nhận xét tối thiểu 10 ký tự.')

            guide_rating = meta.get('guide_rating')
            if rev.guide_id is not None:
                raw_guide_rating = data.get('guide_rating')
                if raw_guide_rating is None or str(raw_guide_rating).strip() == '':
                    raise ValueError('Vui lòng chấm điểm 1–5 sao cho Hướng dẫn viên.')
                try:
                    guide_rating = int(raw_guide_rating)
                except (TypeError, ValueError):
                    raise ValueError('Số sao đánh giá Hướng dẫn viên phải từ 1 đến 5.')
                if guide_rating < 1 or guide_rating > 5:
                    raise ValueError('Số sao đánh giá Hướng dẫn viên phải từ 1 đến 5.')

            tour_tags = [str(t).strip() for t in (data.get('tour_tags') or []) if str(t).strip()][:8]
            guide_tags = [str(t).strip() for t in (data.get('guide_tags') or []) if str(t).strip()][:8]
            low_reasons = [str(t).strip() for t in (data.get('low_rating_reasons') or []) if str(t).strip()][:6]

            edited_at_str = timezone.localtime().strftime('%d/%m/%Y %H:%M')
            next_status = 'pending_approval' if needs_manual_review(comment) else 'approved'
            meta.update({
                'guide_rating': guide_rating,
                'tour_tags': tour_tags,
                'guide_tags': guide_tags,
                'low_rating_reasons': low_reasons,
                'edited_at': edited_at_str,
            })

            rev.rating = rating
            rev.comment = comment[:2000]
            rev.status = next_status
            rev.images = build_review_images_payload(
                photos,
                meta=meta,
                vendor_reply=vendor_reply,
                replied_at=replied_at,
            )
            rev.save(update_fields=['rating', 'comment', 'status', 'images', 'updated_at'])

            locked_tour = Tours.objects.select_for_update().get(id=rev.tour_id)
            agg = Reviews.objects.filter(tour=locked_tour, status='approved').aggregate(
                avg=Avg('rating'), cnt=Count('id')
            )
            cnt = int(agg['cnt'] or 0)
            locked_tour.avg_rating = Decimal(str(round(float(agg['avg'] or 0), 2))) if cnt > 0 else Decimal('0.00')
            locked_tour.total_reviews = cnt
            locked_tour.save(update_fields=['avg_rating', 'total_reviews', 'updated_at'])

            cls._sync_vendor_and_guide_ratings(locked_tour.vendor_id, rev.guide_id)

        return {
            'id': rev.id,
            'tour_id': rev.tour_id,
            'rating': int(rev.rating),
            'tour_rating': int(rev.rating),
            'guide_rating': guide_rating,
            'tour_tags': tour_tags,
            'guide_tags': guide_tags,
            'low_rating_reasons': low_reasons,
            'comment': rev.comment,
            'edited_at': edited_at_str,
            'status': next_status,
            'avg_rating': float(locked_tour.avg_rating),
            'total_reviews': int(locked_tour.total_reviews),
        }

    @classmethod
    def get_guide_reviews(cls, guide_id):
        """Lấy thống kê điểm đánh giá riêng và danh sách review của một Hướng dẫn viên."""
        guide_obj = Guides.objects.select_related('user', 'vendor').filter(id=int(guide_id)).first()
        if not guide_obj:
            return None
        summary = guide_review_summary(guide_obj.id)
        return {
            'guide': {
                'id': guide_obj.id,
                'name': guide_obj.user.name if getattr(guide_obj, 'user', None) else 'Hướng dẫn viên',
                'avatar_url': getattr(guide_obj.user, 'avatar_url', None) if getattr(guide_obj, 'user', None) else None,
                'brand': guide_obj.vendor.brand_name if getattr(guide_obj, 'vendor', None) else '',
                'experience_years': int(guide_obj.experience_years or 0),
                'languages': guide_obj.languages if isinstance(guide_obj.languages, list) else [],
                'license_number': guide_obj.license_number,
                'avg_rating': summary['avg_rating'],
                'total_reviews': summary['total_reviews'],
                'quality_level': summary['quality_level'],
            },
            'avg_rating': summary['avg_rating'],
            'total_reviews': summary['total_reviews'],
            'rating_breakdown': summary['rating_breakdown'],
            'top_tags': summary['top_tags'],
            'quality_level': summary['quality_level'],
            'results': summary['items'],
        }

    @classmethod
    def report_review(cls, user, review_id, reason):
        """Khách hàng hoặc đối tác báo cáo đánh giá vi phạm để BQL kiểm tra."""
        from apps.gamification.models.gamification_models import Reviews

        if not user or not getattr(user, 'is_authenticated', False):
            raise ValueError('Vui lòng đăng nhập để báo cáo đánh giá.')
        clean_reason = str(reason or '').strip()
        if len(clean_reason) < 5:
            raise ValueError('Vui lòng nhập lý do báo cáo tối thiểu 5 ký tự.')

        with transaction.atomic():
            rev = Reviews.objects.select_for_update().filter(id=int(review_id)).first()
            if not rev:
                return None
            photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
            reports = list(meta.get('reports') or [])
            if any(r.get('user_id') == user.id for r in reports):
                raise ValueError('Bạn đã gửi báo cáo cho đánh giá này rồi.')
            reports.append({
                'user_id': user.id,
                'role': getattr(user, 'role', 'customer'),
                'reason': clean_reason[:500],
                'created_at': timezone.localtime().strftime('%d/%m/%Y %H:%M'),
            })
            meta['reports'] = reports
            rev.images = build_review_images_payload(
                photos,
                meta=meta,
                vendor_reply=vendor_reply,
                replied_at=replied_at,
            )
            rev.save(update_fields=['images', 'updated_at'])

        return {'review_id': rev.id, 'reports_count': len(reports)}

    @classmethod
    def create_tour_schedule(cls, tour_id, data):
        """
        Vendor mở thêm chuyến khởi hành mới cho một tour - Lưu trực tiếp vào PostgreSQL (tour_schedules)
        """
        tour_obj = Tours.objects.filter(id=int(tour_id)).first()
        if not tour_obj:
            return None

        dep_date_val = data.get('departure_date')
        if isinstance(dep_date_val, datetime.date):
            dep_date = dep_date_val
        elif dep_date_val:
            try:
                if '/' in str(dep_date_val):
                    parts = str(dep_date_val).split('/')
                    dep_date = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                else:
                    dep_date = datetime.date.fromisoformat(str(dep_date_val))
            except (TypeError, ValueError, IndexError) as exc:
                raise ValueError('Ngày khởi hành không hợp lệ.') from exc
        else:
            raise ValueError('Vui lòng chọn ngày khởi hành.')

        time_slot = data.get('time_slot')
        if time_slot and ' - ' in str(time_slot):
            parts = str(time_slot).split(' - ')
            start_time_val = parts[0].strip()
            end_time_val = parts[1].strip()
        else:
            start_time_val = data.get('start_time', '06:00:00')
            end_time_val = data.get('end_time', '10:30:00')
        if len(str(start_time_val)) == 5:
            start_time_val = f"{start_time_val}:00"
        if len(str(end_time_val)) == 5:
            end_time_val = f"{end_time_val}:00"

        cls._validate_departure_time(dep_date, start_time_val)
        max_cap = int(data.get('max_capacity', tour_obj.max_capacity or 15))
        if max_cap < 1:
            raise ValueError('Số chỗ tối đa phải lớn hơn 0.')
        price_val = data.get('price')
        price_num = int(price_val) if price_val is not None else int(tour_obj.price)

        guide_id = data.get('guide_id')
        guide_obj = None
        if guide_id is not None:
            guide_obj = Guides.objects.filter(
                id=int(guide_id), vendor_id=tour_obj.vendor_id,
            ).first()
            if not guide_obj:
                raise ValueError('Hướng dẫn viên không thuộc đơn vị tổ chức tour này.')

        sch = TourSchedules.objects.create(
            tour=tour_obj,
            guide=guide_obj,
            departure_date=dep_date,
            start_time=start_time_val,
            end_time=end_time_val,
            max_capacity=max_cap,
            booked_count=0,
            price=price_num,
            status='open',
            special_notes=data.get('special_notes', '')
        )

        return {
            'id': str(sch.id),
            'tour_id': tour_obj.id,
            'departure_date': sch.departure_date.strftime('%Y-%m-%d'),
            'formatted_date': sch.departure_date.strftime('%d/%m/%Y'),
            'start_time': str(sch.start_time),
            'end_time': str(sch.end_time),
            'time_slot': f"{str(sch.start_time)[:5]} - {str(sch.end_time)[:5]}",
            'remaining_slots': sch.remaining_slots,
            'max_capacity': sch.max_capacity,
            'booked_count': 0,
            'price': price_num,
            'price_formatted': f"{price_num:,} đ".replace(',', '.'),
            'status': 'open',
            'status_label': f"Còn {max_cap} chỗ trống",
            'guide_id': guide_obj.id if guide_obj else None,
            'guide_name': guide_obj.user.name if guide_obj else None,
            'special_notes': sch.special_notes or ''
        }

    @classmethod
    def book_tour_slot(cls, booking_data, *, customer):
        """
        Du khách đặt chỗ cho một Tour Trekking:
        - Kiểm tra số chỗ còn trống trong TourSchedules (PostgreSQL)
        - Cập nhật booked_count trong TourSchedules
        - Ghi nhận Đơn hàng Orders, OrderVendors, OrderItems vào PostgreSQL
        - Ghi nhận LedgerEntries cho Quỹ ESG Sơn Trà (10%)
        """
        if not customer or not customer.is_authenticated or not customer.is_active:
            raise ValueError('Vui lòng đăng nhập lại để đặt tour.')

        tour_id = booking_data.get('tour_id')
        schedule_id = booking_data.get('schedule_id')
        adults = int(booking_data.get('adults_count', 1))
        children = int(booking_data.get('children_count', 0))
        total_guests = adults + children
        if adults < 1 or children < 0 or total_guests < 1:
            raise ValueError('Số lượng khách đặt tour không hợp lệ.')
        payment_method = booking_data.get('payment_method', 'payos')
        if payment_method not in ('payos', 'paypal', 'vnpay'):
            raise ValueError('Phương thức thanh toán không hợp lệ.')
        if payment_method == 'paypal':
            from apps.payments.services.paypal_client import PayPalClient
            PayPalClient()  # Fail before reserving seats if Sandbox is not configured.
        elif payment_method == 'vnpay':
            from apps.payments.services import vnpay_service
            if not vnpay_service.is_configured():
                raise ValueError('Cổng thanh toán VNPAY Sandbox chưa được cấu hình trên máy chủ.')

        tour_obj = None
        if tour_id:
            tour_obj = (
                Tours.objects.select_related('vendor')
                .filter(id=int(tour_id), status='published', deleted_at__isnull=True)
                .first()
            )
        else:
            tour_obj = (
                Tours.objects.select_related('vendor')
                .filter(status='published', deleted_at__isnull=True)
                .first()
            )
        if not tour_obj:
            raise ValueError('Không tìm thấy trải nghiệm trekking yêu cầu.')

        campaign_item_id = booking_data.get('campaign_item_id')
        # The order belongs to the authenticated customer; contact email can differ.
        customer_email = (booking_data.get('customer_email') or customer.email or '').strip()
        now = timezone.now()

        with transaction.atomic():
            # Khoá TourSchedules để chống overbooking (TOCTOU)
            schedule_obj = None
            if schedule_id and str(schedule_id).isdigit():
                schedule_obj = (
                    TourSchedules.objects.select_for_update()
                    .filter(id=int(schedule_id), tour=tour_obj)
                    .first()
                )
            if not schedule_obj:
                raise ValueError('Không tìm thấy lịch khởi hành đã chọn cho tour này.')
            if schedule_obj.status not in BOOKABLE_SCHEDULE_STATUSES:
                raise ValueError('Lịch khởi hành này hiện không còn mở nhận đặt chỗ.')
            cls._validate_departure_time(schedule_obj.departure_date, schedule_obj.start_time)
            if schedule_obj.remaining_slots < total_guests:
                raise ValueError(
                    f"Chuyến khởi hành chỉ còn {schedule_obj.remaining_slots} chỗ trống, "
                    f"không đủ cho đoàn {total_guests} khách!"
                )

            # Khoá và kiểm tra lại Flash Sale bên trong transaction nếu có
            campaign_item_obj = None
            flash_breakdown = None
            if campaign_item_id:
                from apps.flash_sales.models import CampaignItems
                from apps.flash_sales.services.flash_sale_service import FlashSaleService
                from apps.flash_sales.services.pricing import (
                    FlashSalePriceChangedError,
                    calculate_tiered_quote,
                )
                campaign_item_obj = (
                    CampaignItems.objects.select_for_update()
                    .select_related('session', 'session__campaign')
                    .filter(id=int(campaign_item_id))
                    .first()
                )
                if not campaign_item_obj or campaign_item_obj.tour_id != tour_obj.id:
                    raise ValueError('Suất ưu đãi Flash Sale không hợp lệ cho tour này.')
                if campaign_item_obj.status != 'approved':
                    raise ValueError('Suất ưu đãi Flash Sale chưa được phê duyệt.')
                session = campaign_item_obj.session
                if session:
                    FlashSaleService.maybe_auto_extend_session(session, now)
                if (
                    not session
                    or session.campaign.status != 'active'
                    or session.status not in ('active', 'upcoming')
                    or not (session.start_time <= now <= session.end_time)
                ):
                    raise ValueError('Phiên Flash Sale chưa bắt đầu hoặc đã kết thúc.')

                max_per_customer = FlashSaleService.get_max_tickets_per_customer()
                if customer is not None and getattr(customer, 'id', None):
                    from django.db.models import Sum
                    raw_booked = (
                        OrderItems.objects.filter(
                            campaign_item=campaign_item_obj,
                            order_vendor__order__customer=customer,
                        )
                        .exclude(order_vendor__status='cancelled')
                        .exclude(order_vendor__order__payment_status='cancelled')
                        .aggregate(total=Sum('quantity'))
                        .get('total')
                    )
                    already_booked = int(raw_booked) if isinstance(raw_booked, (int, float)) else 0
                    if already_booked + total_guests > max_per_customer:
                        remaining_quota = max(0, max_per_customer - already_booked)
                        raise ValueError(
                            f'Mỗi khách hàng chỉ được đặt tối đa {max_per_customer} vé Flash Sale cho tour này '
                            f'(bạn đã đặt {already_booked} vé, còn đặt được tối đa {remaining_quota} vé).'
                        )

                quote = calculate_tiered_quote(campaign_item_obj, adults, children)
                expected_total = booking_data.get('expected_total_price')
                expected_unit = booking_data.get('expected_unit_price')
                price_mismatch = False
                if expected_total is not None:
                    price_mismatch = int(Decimal(str(expected_total))) != quote['grand_total']
                elif expected_unit is not None:
                    price_mismatch = int(Decimal(str(expected_unit))) != quote['effective_unit_price']

                if price_mismatch:
                    formatted_total = f"{quote['grand_total']:,}".replace(',', '.')
                    raise FlashSalePriceChangedError(
                        f"Suất ở mức giá cũ vừa có người đặt. Tổng giá mới cho {total_guests} khách là {formatted_total} đ.",
                        payload={
                            'new_total_price': quote['grand_total'],
                            'new_unit_price': quote['effective_unit_price'],
                            'breakdown': quote['breakdown'],
                            'crossed_tiers': quote['crossed_tiers'],
                            'sold_quantity': quote['sold_quantity'],
                            'remaining_slots': quote['remaining_slots'],
                            'current_tier': quote['current_tier'],
                            'next_tier': quote['next_tier'],
                        },
                    )

                campaign_item_obj.sold_quantity = F('sold_quantity') + total_guests
                campaign_item_obj.save(update_fields=['sold_quantity', 'updated_at'])
                campaign_item_obj.refresh_from_db()
                from apps.flash_sales.services.realtime_stream import publish_flash_sale_event
                event_session_id = getattr(campaign_item_obj, 'session_id', None) or getattr(
                    getattr(campaign_item_obj, 'session', None), 'id', None
                )
                event_item_id = campaign_item_obj.id
                event_tour_id = tour_obj.id
                event_sold_qty = getattr(campaign_item_obj, 'sold_quantity', 0)
                transaction.on_commit(
                    lambda: publish_flash_sale_event(
                        'slot_updated',
                        {
                            'session_id': event_session_id,
                            'campaign_item_id': event_item_id,
                            'tour_id': event_tour_id,
                            'sold_quantity': event_sold_qty,
                        },
                    )
                )
                unit_price = quote['effective_unit_price']
                grand_total = quote['grand_total']
                flash_breakdown = quote['breakdown']
            else:
                unit_price = int(schedule_obj.price if schedule_obj.price is not None else tour_obj.price)
                adults_total = adults * unit_price
                children_total = int(children * unit_price * 0.7)
                grand_total = adults_total + children_total

            subtotal_before_discount = grand_total
            voucher_code = (booking_data.get('voucher_code') or '').strip()
            use_points_discount = bool(booking_data.get('use_points_discount'))
            applied_user_voucher = None
            voucher_discount = 0
            points_discount = 0
            locked_customer = None

            if voucher_code:
                from django.db.models import Q
                from apps.orders.models import UserVouchers
                voucher_q = Q(voucher__code=voucher_code)
                if voucher_code.isdigit():
                    voucher_q = voucher_q | Q(id=int(voucher_code))
                applied_user_voucher = (
                    UserVouchers.objects.select_for_update()
                    .select_related('voucher')
                    .filter(user=customer, status='unused')
                    .filter(voucher_q)
                    .first()
                )
                if not applied_user_voucher:
                    raise ValueError('Mã voucher không hợp lệ hoặc đã được sử dụng.')
                v_obj = applied_user_voucher.voucher
                if getattr(v_obj, 'discount_percent', None):
                    voucher_discount = int(round(subtotal_before_discount * int(v_obj.discount_percent) / 100))
                elif getattr(v_obj, 'discount_amount', None):
                    voucher_discount = int(Decimal(str(v_obj.discount_amount)))
                else:
                    voucher_discount = int(round(subtotal_before_discount * 0.15))
                applied_user_voucher.status = 'used'
                applied_user_voucher.used_at = now
                applied_user_voucher.save(update_fields=['status', 'used_at'])

            if use_points_discount:
                locked_customer = Users.objects.select_for_update().filter(id=customer.id).first() or customer
                current_points = int(getattr(locked_customer, 'total_eco_points', 0) or 0)
                if current_points < 200:
                    raise ValueError('Số dư RE-Points không đủ 200 điểm để áp dụng giảm giá.')
                points_discount = 40000

            total_discount = min(subtotal_before_discount, voucher_discount + points_discount)
            grand_total = max(0, subtotal_before_discount - total_discount)

            esg_fund_contribution = int(grand_total * 0.10)
            vendor_payout = grand_total - esg_fund_contribution
            dep_date = schedule_obj.departure_date if schedule_obj else (timezone.now().date() + datetime.timedelta(days=2))

            # Cập nhật số chỗ trong TourSchedules trên bản ghi đã khoá
            schedule_obj.booked_count += total_guests
            if schedule_obj.booked_count >= schedule_obj.max_capacity:
                schedule_obj.status = 'full'
            schedule_obj.save(update_fields=['booked_count', 'status', 'updated_at'])

            # Tạo Order (Khởi tạo trạng thái pending cho thanh toán trực tuyến PayOS)
            rand_code = random.randint(100000, 999999)
            customer_name = booking_data.get('customer_name', customer.name)
            customer_phone = booking_data.get('customer_phone', customer.phone)
            order = Orders.objects.create(
                customer=customer,
                order_code=f"ORD-2026-TK{rand_code}",
                grand_total=Decimal(grand_total),
                payment_status='pending',
                expires_at=timezone.now() + datetime.timedelta(minutes=15) if payment_method in ('paypal', 'payos', 'vnpay') else None,
                shipping_address={
                    'payment_method': payment_method,
                    'customer_name': customer_name,
                    'customer_phone': customer_phone,
                    'customer_email': customer_email,
                    'pickup_location': booking_data.get('pickup_location', 'Đà Nẵng'),
                    'special_notes': booking_data.get('special_notes', ''),
                    **({'flash_sale_breakdown': flash_breakdown} if flash_breakdown else {}),
                    **({'voucher_code': voucher_code, 'voucher_discount': voucher_discount} if voucher_discount else {}),
                    **({'points_discount': points_discount} if points_discount else {}),
                }
            )

            # Tạo OrderVendor
            assigned_guide = getattr(schedule_obj, 'guide', None)
            ov_extra = {}
            if applied_user_voucher is not None:
                ov_extra['user_voucher'] = applied_user_voucher
            if total_discount > 0:
                ov_extra['discount_amount'] = Decimal(total_discount)
            order_vendor = OrderVendors.objects.create(
                order=order,
                vendor=tour_obj.vendor,
                guide=assigned_guide,
                scheduled_date=dep_date,
                subtotal=Decimal(grand_total),
                status='waiting_payment',
                **ov_extra,
            )

            if points_discount > 0:
                from apps.gamification.models.gamification_models import PointsLedger
                PointsLedger.objects.create(
                    user=locked_customer or customer,
                    vendor=None,
                    points_change=-200,
                    reason=f"Đổi 200 RE-Points giảm giá đơn đặt tour #{order.order_code}",
                    reference_type="booking_points_discount",
                    order_vendor=order_vendor,
                )

            # Tạo OrderItems
            order_item = OrderItems.objects.create(
                order_vendor=order_vendor,
                item_type='tour',
                tour_id=tour_obj.id,
                campaign_item=campaign_item_obj,
                tour_schedule=schedule_obj,
                quantity=total_guests,
                unit_price=Decimal(unit_price),
                price_at_sale_time=Decimal(grand_total)
            )

            guest_details = booking_data.get('participants')
            if not guest_details:
                guest_details = (
                    [{'full_name': customer_name, 'phone': customer_phone}]
                    if total_guests == 1 else [{} for _ in range(total_guests)]
                )
            TourParticipants.objects.bulk_create([
                TourParticipants(
                    tour_schedule=schedule_obj,
                    order_item=order_item,
                    participant_no=index,
                    full_name=guest.get('full_name'),
                    phone=guest.get('phone'),
                    emergency_contact_name=guest.get('emergency_contact_name'),
                    emergency_contact_phone=guest.get('emergency_contact_phone'),
                    special_notes=guest.get('special_notes'),
                )
                for index, guest in enumerate(guest_details, start=1)
            ])

            # LedgerEntries chỉ được ghi nhận khi đơn hàng thanh toán thành công (confirm_order_payment).

        departure_date_str = dep_date.strftime('%d/%m/%Y')
        time_slot = f"{str(schedule_obj.start_time)[:5]} - {str(schedule_obj.end_time)[:5]}" if schedule_obj else "06:00 - 10:30"

        # Tự động tạo liên kết thanh toán VietQR qua PayOS
        payos_data = None
        payos_order_code = None
        if payment_method == 'payos':
            try:
                from apps.payments.services.payos_service import PayOSService
                from apps.payments.models.payment_models import PaymentTransactions
                payos_order_code = int(f"{order.id}{random.randint(100, 999)}")
                payos_items = (
                    [
                        {
                            "name": f"{tour_obj.title[:38]} ({b['label']})"[:50],
                            "quantity": int(b['quantity']),
                            "price": int(b['unit_price']),
                        }
                        for b in flash_breakdown
                    ]
                    if flash_breakdown and children == 0
                    else [{"name": tour_obj.title[:50], "quantity": 1, "price": int(grand_total)}]
                )
                payos_res = PayOSService.create_payment_link(
                    order_code=payos_order_code,
                    amount=grand_total,
                    description=f"Tour {tour_obj.id} #{rand_code}",
                    items=payos_items
                )
                if payos_res.get("status") == "success":
                    payos_data = payos_res.get("data")
                    PaymentTransactions.objects.create(
                        order=order,
                        payment_gateway='payos',
                        transaction_code=str(payos_order_code),
                        amount=Decimal(grand_total),
                        status='pending',
                        raw_response=payos_data
                    )
            except Exception as e:
                print("PayOS Link Creation Note:", e)

        return {
            'id': order.order_code,
            'order_id': order.id,
            'order_code': order.order_code,
            'customer_name': booking_data.get('customer_name', customer.name if customer else 'Du Khách'),
            'customer_phone': booking_data.get('customer_phone', '0905 123 456'),
            'customer_email': customer_email,
            'pickup_location': booking_data.get('pickup_location', 'Đà Nẵng'),
            'experience_name': tour_obj.title,
            'tour_id': tour_obj.id,
            'schedule_id': str(schedule_obj.id) if schedule_obj else 'SCH-DEFAULT',
            'booking_date': departure_date_str,
            'departure_date_raw': dep_date.strftime('%Y-%m-%d'),
            'time_slot': time_slot,
            'adults_count': adults,
            'children_count': children,
            'guests_label': f"{adults} người lớn{f', {children} trẻ em' if children > 0 else ''}",
            'total_price': grand_total,
            'total_price_formatted': f"{grand_total:,} đ".replace(',', '.'),
            'esg_fund_contribution': esg_fund_contribution,
            'esg_fund_formatted': f"{esg_fund_contribution:,} đ".replace(',', '.'),
            'vendor_payout': vendor_payout,
            'status': 'waiting_payment',
            'status_label': 'Chờ thanh toán',
            'payment_status': 'pending',
            'payment_status_label': (
                'Chờ thanh toán PayPal Sandbox' if payment_method == 'paypal'
                else ('Chờ thanh toán VNPAY Sandbox' if payment_method == 'vnpay' else 'Chờ chuyển khoản VietQR')
            ),
            'payment_method': (
                'PayPal Sandbox' if payment_method == 'paypal'
                else ('VNPAY Sandbox' if payment_method == 'vnpay' else 'PayOS VietQR')
            ),
            'payos': payos_data,
            'payos_order_code': payos_order_code,
            'is_flash_sale': bool(campaign_item_obj),
            'campaign_item_id': campaign_item_obj.id if campaign_item_obj else None,
            'flash_sale_breakdown': flash_breakdown,
            'special_notes': booking_data.get('special_notes', ''),
            'guide_name': assigned_guide.user.name if assigned_guide else None,
            'created_at': timezone.now().strftime('%d/%m/%Y %H:%M')
        }

    @classmethod
    def get_customer_bookings(cls, user=None, email=None, status=None):
        """
        Lấy danh sách các đơn đặt vé Tour Trekking của Khách Hàng từ PostgreSQL.
        Trả về chi tiết: mã đơn, vé E-Ticket, lịch khởi hành, hướng dẫn viên,
        điểm đón, số khách, tổng tiền, nhãn Flash Sale và mã QR check-in.
        """
        # Đồng bộ tự động các đơn PayOS đang chờ xử lý của chính người dùng
        try:
            from apps.payments.views.payos_views import sync_pending_payos_transactions
            sync_pending_payos_transactions(limit=5, user=user, email=email)
        except Exception:
            pass

        from django.db.models import Q
        qs = OrderVendors.objects.select_related(
            'order', 'order__customer', 'vendor', 'guide', 'guide__user'
        ).prefetch_related(
            'orderitems_set__tour',
            'orderitems_set__campaign_item'
        ).filter(orderitems__item_type='tour').distinct().order_by('-created_at')

        if user and user.is_authenticated:
            qs = qs.filter(Q(order__customer=user))
        elif email:
            qs = qs.filter(order__customer__email__iexact=email.strip())
        else:
            return []

        if status and status != 'all':
            qs = qs.filter(status=status)

        results = []
        status_map = {
            'confirmed': 'Đã xác nhận',
            'completed': 'Hoàn thành',
            'waiting_payment': 'Chờ xác nhận',
            'cancelled': 'Đã hủy'
        }

        ov_list = list(qs)
        review_map = {}
        tx_by_order = {}
        if ov_list:
            try:
                from apps.gamification.models.gamification_models import Reviews
                ov_ids = [ov.id for ov in ov_list if getattr(ov, 'id', None) is not None]
                for rev in Reviews.objects.filter(order_vendor_id__in=ov_ids):
                    review_map[(rev.order_vendor_id, rev.tour_id)] = rev
            except Exception:
                review_map = {}
            try:
                from apps.payments.models import PaymentTransactions
                order_ids = [ov.order_id for ov in ov_list if getattr(ov, 'order_id', None) is not None]
                for tx in PaymentTransactions.objects.filter(order_id__in=order_ids).order_by('id'):
                    tx_by_order[tx.order_id] = tx
            except Exception:
                tx_by_order = {}

        for ov in ov_list:
            order = ov.order
            shipping = order.shipping_address or {}
            items = list(ov.orderitems_set.all())
            tour_item = items[0] if items else None
            tour = tour_item.tour if tour_item else None
            is_flash = bool(tour_item and tour_item.campaign_item_id)
            existing_rev = review_map.get((ov.id, tour.id if tour else None))

            dep_date_str = ov.scheduled_date.strftime('%d/%m/%Y') if ov.scheduled_date else '26/10/2026'
            refund_status_labels = {
                'none': 'Không có',
                'requested': 'Chờ duyệt hoàn tiền',
                'in_review': 'Đang xem xét',
                'approved': 'Đã duyệt hoàn tiền',
                'refunded': 'Đã hoàn tiền',
                'rejected': 'Từ chối hoàn tiền',
            }

            tx = tx_by_order.get(order.id)
            tx_meta = tx.raw_response if tx and isinstance(tx.raw_response, dict) else {}
            resolved_guide = cls._resolve_booking_guide(ov, tour) if tour else ov.guide
            rev_meta = parse_review_payload(existing_rev.images)[3] if existing_rev else {}
            is_expired, deadline_str, days_remaining = cls._review_deadline_info(ov)
            is_absent_blocked = cls._is_absent_no_show(ov)
            review_can_edit = bool(
                existing_rev
                and not rev_meta.get('edited_at')
                and existing_rev.created_at
                and (timezone.now() - existing_rev.created_at) <= datetime.timedelta(hours=48)
            )

            results.append({
                'id': ov.id,
                'order_code': order.order_code,
                'tour_id': tour.id if tour else None,
                'order_id': order.id,
                'schedule_id': tour_item.tour_schedule_id if tour_item else None,
                'payment_method': (tx.payment_gateway if tx else None) or shipping.get('payment_method', 'payos'),
                'payment_status': order.payment_status,
                'payment_status_label': (
                    'Đã hoàn tiền' if order.payment_status == 'refunded'
                    else ('Đã thanh toán' if order.payment_status == 'paid' else 'Chờ thanh toán')
                ),
                'payment_transaction': {
                    'gateway': tx.payment_gateway,
                    'transaction_code': tx.transaction_code,
                    'amount': int(tx.amount),
                    'status': tx.status,
                    'vnp_transaction_no': tx_meta.get('vnp_TransactionNo') or None,
                    'vnp_bank_code': tx_meta.get('vnp_BankCode') or None,
                    'vnp_pay_date': tx_meta.get('vnp_PayDate') or None,
                    'capture_id': tx_meta.get('capture_id') or None,
                    'refund_reference': tx_meta.get('refund_reference') or None,
                    'refund_provider_mode': tx_meta.get('refund_provider_mode') or None,
                    'created_at': tx.created_at.strftime('%d/%m/%Y %H:%M') if tx.created_at else None,
                } if tx else None,
                'tour_title': tour.title if tour else 'Chinh Phục Đỉnh Bàn Cờ - Ngắm Vịnh Sơn Trà',
                'tour_cover_image': tour.cover_image_url if tour and tour.cover_image_url else 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
                'tour_difficulty': tour.difficulty_level if tour else 'moderate',
                'tour_duration': float(tour.duration_hours) if tour and tour.duration_hours else 4.0,
                'vendor_name': ov.vendor.brand_name if ov.vendor else 'Sơn Trà Trekking',
                'scheduled_date': dep_date_str,
                'departure_date_formatted': dep_date_str,
                'departure_date_raw': ov.scheduled_date.strftime('%Y-%m-%d') if ov.scheduled_date else '2026-10-24',
                'time_slot': '06:00 - 10:30',
                'customer_name': shipping.get('customer_name', order.customer.name if order.customer else 'Du Khách'),
                'customer_phone': shipping.get('customer_phone', order.customer.phone if order.customer else '0905 123 456'),
                'customer_email': shipping.get('customer_email', order.customer.email if order.customer else ''),
                'pickup_location': shipping.get('pickup_location', 'Khách sạn trung tâm Đà Nẵng'),
                'special_notes': shipping.get('special_notes', ''),
                'total_guests': sum(it.quantity for it in items) if items else 1,
                'adults_count': shipping.get('adults_count', sum(it.quantity for it in items) if items else 1),
                'children_count': shipping.get('children_count', 0),
                'total_price': float(ov.subtotal),
                'total_amount': float(ov.subtotal),
                'final_price': float(ov.subtotal),
                'total_price_formatted': f"{int(ov.subtotal):,} đ".replace(',', '.'),
                'esg_fund_contribution': int(float(ov.subtotal) * 0.10),
                'status': ov.status,
                'status_label': status_map.get(ov.status, 'Đã xác nhận'),
                'refund_status': ov.refund_status or 'none',
                'refund_status_label': refund_status_labels.get(ov.refund_status or 'none', 'Không có'),
                'refunded_amount': int(ov.refunded_amount or 0),
                'refund_reason': ov.refund_reason or '',
                'refund_requested_at': ov.refund_requested_at.strftime('%d/%m/%Y %H:%M') if ov.refund_requested_at else None,
                'refunded_at': ov.refunded_at.strftime('%d/%m/%Y %H:%M') if ov.refunded_at else None,
                'refund_bank_info': shipping.get('refund_bank_info') or None,
                'has_reviewed': bool(existing_rev),
                'review_id': existing_rev.id if existing_rev else None,
                'review_rating': int(existing_rev.rating) if existing_rev else None,
                'review_guide_rating': rev_meta.get('guide_rating') if existing_rev else None,
                'review_tour_tags': rev_meta.get('tour_tags') or [],
                'review_guide_tags': rev_meta.get('guide_tags') or [],
                'review_low_rating_reasons': rev_meta.get('low_rating_reasons') or [],
                'review_comment': (existing_rev.comment or '') if existing_rev else '',
                'review_edited_at': rev_meta.get('edited_at'),
                'review_can_edit': review_can_edit,
                'review_deadline': deadline_str,
                'review_days_remaining': days_remaining,
                'review_expired': is_expired,
                'review_absent_blocked': is_absent_blocked,
                'is_flash_sale': is_flash,
                'campaign_item_id': tour_item.campaign_item_id if tour_item else None,
                'has_guide': bool(resolved_guide),
                'guide_id': resolved_guide.id if resolved_guide else None,
                'guide_name': (
                    resolved_guide.user.name
                    if (resolved_guide and getattr(resolved_guide, 'user', None))
                    else None
                ),
                'guide_phone': (
                    resolved_guide.user.phone
                    if (resolved_guide and getattr(resolved_guide, 'user', None))
                    else None
                ),
                'guide_avatar_url': (
                    getattr(resolved_guide.user, 'avatar_url', None)
                    if (resolved_guide and getattr(resolved_guide, 'user', None))
                    else None
                ),
                'qr_token': f"TICKET:{order.order_code}:{tour.id if tour else 1}:{dep_date_str}",
                'created_at': ov.created_at.strftime('%d/%m/%Y %H:%M') if ov.created_at else ''
            })

        return results
