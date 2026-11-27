from rest_framework import permissions, serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Users

from ..models.schedule_chat import ScheduleChatMessage
from .field_views import active_paid_trip_items, authorize


class MessageInput(serializers.Serializer):
    content = serializers.CharField(max_length=2000)


class HistoryInput(serializers.Serializer):
    before = serializers.IntegerField(min_value=1, required=False)


class ScheduleChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    page_size = 50

    def _room(self, user, schedule_id):
        schedule, guide = authorize(user, schedule_id)
        if guide and not active_paid_trip_items().filter(tour_schedule_id=schedule.id).exists():
            raise NotFound('Nhóm chat sẽ mở khi có khách thanh toán chuyến này.')
        return schedule

    def get(self, request, schedule_id):
        schedule = self._room(request.user, schedule_id)
        cursor = HistoryInput(data=request.query_params)
        cursor.is_valid(raise_exception=True)
        messages = ScheduleChatMessage.objects.filter(schedule_id=schedule.id)
        if 'before' in cursor.validated_data:
            messages = messages.filter(id__lt=cursor.validated_data['before'])
        page = list(messages.order_by('-id')[:self.page_size + 1])
        has_older = len(page) > self.page_size
        page = page[:self.page_size]
        names = dict(Users.objects.filter(id__in={msg.sender_id for msg in page}).values_list('id', 'name'))
        return Response({'data': {
            'title': schedule.tour.title,
            'next_before': page[-1].id if has_older else None,
            'messages': [{
                'id': msg.id,
                'sender_name': names.get(msg.sender_id) or 'Thành viên',
                'is_mine': msg.sender_id == request.user.id,
                'content': msg.content,
                'created_at': msg.created_at,
            } for msg in page],
        }})

    def post(self, request, schedule_id):
        schedule = self._room(request.user, schedule_id)
        if schedule.status == 'cancelled':
            raise PermissionDenied('Chuyến đã hủy nên không thể gửi tin nhắn.')
        message = MessageInput(data=request.data)
        message.is_valid(raise_exception=True)
        saved = ScheduleChatMessage.objects.create(
            schedule_id=schedule.id, sender_id=request.user.id, **message.validated_data,
        )
        return Response({'data': {'id': saved.id}}, status=status.HTTP_201_CREATED)
