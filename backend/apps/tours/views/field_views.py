from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models.field_event import TripFieldEvent
from ..models.tour_models import TourParticipants, TourSchedules
from ..serializers.guide_trip_serializers import TourParticipantSerializer
from ..serializers.tour_serializers import RouteSerializer
from ..services.guide_trip_service import GuideTripService
from apps.vendors.models import Guides
from apps.orders.models.order_models import OrderItems
from common.permissions import IsVendor


def paid_participants(user):
    return GuideTripService.confirmed_participants().filter(
        order_item__order_vendor__order__customer_id=user.id,
    )


def paid_trip_items(user):
    # Older real bookings can predate the individual participant records.
    return OrderItems.objects.filter(
        item_type='tour', tour_schedule__isnull=False,
        order_vendor__order__customer_id=user.id,
        order_vendor__order__payment_status='paid',
    ).exclude(order_vendor__status='cancelled').exclude(order_vendor__refund_status='refunded')


def authorize(user, schedule_id):
    schedule = TourSchedules.objects.select_related('tour', 'guide__user').filter(id=schedule_id).first()
    if not schedule:
        raise NotFound('Không tìm thấy chuyến đi.')
    guide = user.role == 'guide' and schedule.guide and schedule.guide.user_id == user.id
    if not guide and not paid_trip_items(user).filter(tour_schedule_id=schedule_id).exists():
        raise PermissionDenied('Bạn không thuộc chuyến đi này.')
    return schedule, bool(guide)


class FieldEventInput(serializers.Serializer):
    request_id = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=['notice', 'support', 'position'])
    content = serializers.CharField(max_length=3000, required=False, allow_blank=True)
    participant_id = serializers.IntegerField(required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90, required=False)
    longitude = serializers.FloatField(min_value=-180, max_value=180, required=False)
    accuracy = serializers.FloatField(min_value=0, max_value=10000, required=False)
    captured_at = serializers.DateTimeField(required=False)
    sos = serializers.BooleanField(default=False)
    consent = serializers.BooleanField(default=False)

    def validate(self, data):
        if data['kind'] in {'notice', 'support'} and not data.get('content', '').strip():
            raise ValidationError('Cần nhập nội dung.')
        if data['kind'] == 'position':
            if not data['consent'] or not all(k in data for k in ('latitude', 'longitude', 'captured_at')):
                raise ValidationError('Cần đồng ý chia sẻ vị trí và cung cấp tọa độ, thời gian GPS.')
        if ('latitude' in data) != ('longitude' in data):
            raise ValidationError('Cần cung cấp đủ vĩ độ và kinh độ.')
        captured = data.get('captured_at')
        if captured and (captured > timezone.now() + timedelta(minutes=2) or captured < timezone.now() - timedelta(hours=24)):
            raise ValidationError('Thời gian GPS không hợp lệ hoặc đã quá 24 giờ.')
        return data


def event_data(event):
    return {key: getattr(event, key) for key in (
        'id', 'user_id', 'participant_id', 'kind', 'status', 'payload', 'created_at', 'updated_at',
    )}


class MyFieldTripsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids = paid_trip_items(request.user).values_list('tour_schedule_id', flat=True)
        trips = TourSchedules.objects.filter(id__in=ids).select_related('tour', 'guide__user').order_by('-departure_date')
        return Response({'data': [schedule_data(s) for s in trips]})


def schedule_data(schedule):
    guide = schedule.guide.user if schedule.guide else None
    return {
        'id': schedule.id, 'tour_id': schedule.tour_id, 'tour_title': schedule.tour.title,
        'departure_date': schedule.departure_date, 'start_time': schedule.start_time,
        'end_time': schedule.end_time, 'status': schedule.status,
        'booked_count': schedule.booked_count, 'max_capacity': schedule.max_capacity,
        'special_notes': schedule.special_notes, 'actual_started_at': schedule.actual_started_at,
        'actual_ended_at': schedule.actual_ended_at, 'trip_report': schedule.trip_report,
        'guide_name': guide.name if guide else '', 'guide_phone': guide.phone if guide else '',
        'duration_hours': schedule.tour.duration_hours,
    }


class FieldTripView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, schedule_id):
        schedule, guide = authorize(request.user, schedule_id)
        route = getattr(schedule.tour, 'routes', None)
        people = GuideTripService.get_participants(schedule) if guide else paid_participants(request.user).filter(tour_schedule=schedule)
        events = TripFieldEvent.objects.filter(schedule_id=schedule_id).exclude(kind__in=['attendance', 'position'])
        if not guide:
            events = events.filter(kind='notice') | events.filter(user_id=request.user.id)
        recent_ids = events.order_by('-created_at').values('pk')[:200]
        events = events.filter(Q(pk__in=recent_ids) | Q(kind='support', status__in=['received', 'acknowledged']))
        positions = TripFieldEvent.objects.filter(schedule_id=schedule_id, kind='position', updated_at__gte=timezone.now() - timedelta(hours=24))
        if not guide:
            positions = positions.filter(user_id=request.user.id)
        return Response({
            'schedule': schedule_data(schedule), 'is_guide': guide,
            'route': RouteSerializer(route).data if route else None,
            'participants': TourParticipantSerializer(people, many=True).data,
            'events': [event_data(e) for e in events.order_by('-created_at', '-id')],
            'positions': [event_data(e) for e in positions],
            'server_time': timezone.now(),
        })

    def post(self, request, schedule_id):
        with transaction.atomic():
            # Serialize writes with start/finish and offline retries.
            schedule = TourSchedules.objects.select_for_update().filter(id=schedule_id).first()
            if not schedule:
                raise NotFound('Không tìm thấy chuyến đi.')
            _, guide = authorize(request.user, schedule_id)
            serializer = FieldEventInput(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = dict(serializer.validated_data)
            kind = data.pop('kind')
            request_id = data.pop('request_id')
            if kind == 'notice' and not guide:
                raise PermissionDenied('Chỉ hướng dẫn viên được gửi thông báo.')
            if kind == 'position' and (guide or schedule.status != 'in_progress'):
                raise ValidationError('Chỉ chia sẻ vị trí thành viên trong chuyến đang diễn ra.')
            old = TripFieldEvent.objects.filter(request_id=request_id).first()
            if old:
                if old.user_id != request.user.id or old.schedule_id != schedule_id or old.kind != kind:
                    raise PermissionDenied('Mã thao tác không hợp lệ.')
                return Response({'data': event_data(old)})
            if schedule.status in {'completed', 'cancelled', 'canceled'}:
                raise ValidationError('Chuyến đã kết thúc hoặc hủy.')
            participant_id = data.pop('participant_id', None)
            if participant_id:
                people = GuideTripService.get_participants(schedule) if guide else paid_participants(request.user).filter(tour_schedule=schedule)
                if not people.filter(id=participant_id).exists():
                    raise PermissionDenied('Thành viên không thuộc quyền quản lý của bạn.')
            if 'captured_at' in data:
                data['captured_at'] = data['captured_at'].isoformat()
            data['sender_name'] = request.user.name
            data['sender_phone'] = request.user.phone or ''
            if kind == 'position':
                TripFieldEvent.objects.filter(schedule_id=schedule_id, user_id=request.user.id, kind='position').delete()
            event = TripFieldEvent.objects.create(
                schedule_id=schedule_id, user_id=request.user.id, participant_id=participant_id,
                request_id=request_id, kind=kind, payload=data,
            )
            return Response({'data': event_data(event)}, status=201)

    def delete(self, request, schedule_id):
        with transaction.atomic():
            authorize(request.user, schedule_id)
            TourSchedules.objects.select_for_update().get(id=schedule_id)
            TripFieldEvent.objects.filter(schedule_id=schedule_id, user_id=request.user.id, kind='position').delete()
        return Response(status=204)


class FieldSupportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, schedule_id, event_id):
        with transaction.atomic():
            _, guide = authorize(request.user, schedule_id)
            if not guide:
                raise PermissionDenied('Chỉ hướng dẫn viên được xử lý yêu cầu.')
            event = TripFieldEvent.objects.select_for_update().filter(id=event_id, schedule_id=schedule_id, kind='support').first()
            if not event:
                raise NotFound('Không tìm thấy yêu cầu.')
            target = request.data.get('status')
            if target not in {'acknowledged', 'resolved'}:
                raise ValidationError('Trạng thái xử lý không hợp lệ.')
            if target != event.status and (event.status, target) not in {('received', 'acknowledged'), ('acknowledged', 'resolved')}:
                raise ValidationError('Cần xác nhận đã nhận trước khi hoàn tất xử lý.')
            event.status = target
            event.payload = {**event.payload, 'handled_by': request.user.id}
            event.save(update_fields=['status', 'payload', 'updated_at'])
            return Response({'data': event_data(event)})


class GuideAssignmentView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def patch(self, request, schedule_id):
        with transaction.atomic():
            schedule = TourSchedules.objects.select_for_update().filter(
                id=schedule_id, tour__vendor__user_id=request.user.id,
            ).first()
            if not schedule:
                raise NotFound('Không tìm thấy chuyến của đơn vị bạn.')
            if schedule.status in {'in_progress', 'completed', 'cancelled', 'canceled'}:
                raise ValidationError('Chỉ thay đổi phân công trước khi chuyến bắt đầu.')
            if 'guide_id' not in request.data:
                raise ValidationError('Cần cung cấp guide_id hoặc null để bỏ phân công.')
            guide_id = serializers.IntegerField(allow_null=True).run_validation(request.data['guide_id'])
            guide = None
            if guide_id is not None:
                guide = Guides.objects.filter(id=guide_id, vendor_id=schedule.tour.vendor_id,
                    user__role='guide', user__status='active').first()
                if not guide:
                    raise ValidationError('Hướng dẫn viên phải đang hoạt động và thuộc đơn vị tổ chức.')
            schedule.guide = guide
            schedule.save(update_fields=['guide', 'updated_at'])
            return Response({'data': schedule_data(schedule)})
