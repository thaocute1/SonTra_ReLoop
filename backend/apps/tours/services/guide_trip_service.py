from django.db import transaction
from django.utils import timezone
from ..models.field_event import TripFieldEvent

from ..models.tour_models import (
    Checkpoints,
    TourAttendanceLogs,
    TourParticipants,
    TourSchedules,
)


class GuideTripService:
    @staticmethod
    def confirmed_participants():
        # Refunds belong to refund_status, not the vendor_order_status enum.
        return TourParticipants.objects.filter(
            order_item__order_vendor__order__payment_status='paid',
        ).exclude(
            order_item__order_vendor__status='cancelled',
        ).exclude(
            order_item__order_vendor__refund_status='refunded',
        )

    @staticmethod
    def assigned_schedules(user_id):
        return TourSchedules.objects.filter(guide__user_id=user_id).select_related('tour', 'guide')

    @staticmethod
    def get_assigned_schedule(user_id, schedule_id):
        return TourSchedules.objects.filter(
            id=schedule_id,
            guide__user_id=user_id,
        ).select_related('tour', 'guide').first()

    @classmethod
    def get_participants(cls, schedule):
        return cls.confirmed_participants().filter(
            tour_schedule=schedule,
        ).select_related('order_item').prefetch_related('attendance_logs')

    @classmethod
    def attendance_summary(cls, schedule):
        participants = list(cls.get_participants(schedule))
        present = 0
        for person in participants:
            departure = next((log for log in person.attendance_logs.all() if log.attendance_stage == 'departure'), None)
            if departure and departure.participant_status in {'present', 'late'}:
                present += 1
        return {'participant_count': len(participants), 'present_count': present}

    @classmethod
    @transaction.atomic
    def update_participant(cls, schedule, participant_id, data):
        current = TourSchedules.objects.select_for_update().get(id=schedule.id)
        if current.guide_id != schedule.guide_id or current.status in {'completed', 'cancelled', 'canceled'}:
            raise ValueError('Phân công hoặc trạng thái chuyến đã thay đổi. Vui lòng tải lại.')
        participant = cls.get_participants(schedule).filter(
            id=participant_id,
            tour_schedule=schedule,
        ).first()
        if not participant:
            return None
        for field, value in data.items():
            setattr(participant, field, value)
        participant.save(update_fields=[*data.keys(), 'updated_at'])
        return participant

    @staticmethod
    @transaction.atomic
    def record_attendance(schedule, guide, data):
        schedule = TourSchedules.objects.select_for_update().get(id=schedule.id)
        if schedule.guide_id != guide.id:
            raise ValueError('Bạn không còn được phân công chuyến này.')
        request_id = data.get('request_id')
        if request_id:
            receipt = TripFieldEvent.objects.filter(request_id=request_id).first()
            if receipt:
                if receipt.user_id != guide.user_id or receipt.schedule_id != schedule.id or receipt.kind != 'attendance' or receipt.participant_id != data['participant_id']:
                    raise ValueError('Mã thao tác không hợp lệ.')
                return TourAttendanceLogs.objects.get(id=receipt.payload['log_id'])
        if schedule.status in {'completed', 'cancelled', 'canceled'}:
            raise ValueError('Chuyến đã kết thúc hoặc hủy.')
        stage = data['attendance_stage']
        if stage == 'departure' and schedule.status == 'in_progress':
            raise ValueError('Chuyến đã xuất phát; hãy dùng điểm danh checkpoint hoặc khi về.')
        if stage != 'departure' and schedule.status != 'in_progress':
            raise ValueError('Chuyến chưa bắt đầu.')
        participant = GuideTripService.get_participants(schedule).filter(
            id=data['participant_id'],
            tour_schedule=schedule,
        ).first()
        if not participant:
            raise ValueError('Không tìm thấy thành viên trong chuyến này.')

        if stage != 'departure':
            departure = participant.attendance_logs.filter(attendance_stage='departure').first()
            if not departure or departure.participant_status not in {'present', 'late'}:
                raise ValueError('Thành viên chưa được xác nhận tham gia lúc xuất phát.')
            latest = participant.attendance_logs.first()
            if stage == 'checkpoint' and latest and latest.attendance_stage == 'return' and latest.participant_status in {'returned', 'early_return'}:
                raise ValueError('Thành viên đã được xác nhận về hoặc bàn giao.')

        checkpoint = None
        checkpoint_id = data.get('checkpoint_id')
        if checkpoint_id:
            checkpoint = Checkpoints.objects.filter(
                id=checkpoint_id,
                route__tour_id=schedule.tour_id,
            ).first()
            if not checkpoint:
                raise ValueError('Checkpoint không thuộc tuyến của chuyến này.')

        log = TourAttendanceLogs.objects.create(
            participant=participant,
            checkpoint=checkpoint,
            attendance_stage=data['attendance_stage'],
            participant_status=data['participant_status'],
            confirmed_by_guide=guide,
            confirmed_at=timezone.now(),
            note=data.get('note'),
        )
        if request_id:
            TripFieldEvent.objects.create(schedule_id=schedule.id, user_id=guide.user_id,
                participant_id=participant.id, request_id=request_id, kind='attendance', payload={'log_id': log.id})
        return log

    @classmethod
    def start_trip(cls, user_id, schedule_id):
        with transaction.atomic():
            schedule = TourSchedules.objects.select_for_update().filter(
                id=schedule_id,
                guide__user_id=user_id,
            ).first()
            if not schedule:
                return None, 'not_found'
            if schedule.status in {'cancelled', 'canceled', 'completed'}:
                return schedule, 'invalid_status'
            if schedule.actual_started_at:
                return schedule, 'already_started'

            people = list(cls.get_participants(schedule))
            if not people or any(not p.attendance_logs.first() for p in people):
                return schedule, 'incomplete_attendance'
            if not any(p.attendance_logs.first().participant_status in {'present', 'late'} for p in people):
                return schedule, 'incomplete_attendance'

            schedule.status = 'in_progress'
            schedule.actual_started_at = timezone.now()
            schedule.save(update_fields=['status', 'actual_started_at', 'updated_at'])
            return schedule, 'started'

    @classmethod
    def finish_trip(cls, user_id, schedule_id, report):
        with transaction.atomic():
            schedule = TourSchedules.objects.select_for_update().filter(
                id=schedule_id,
                guide__user_id=user_id,
            ).first()
            if not schedule:
                return None, 'not_found', []
            if not schedule.actual_started_at or schedule.status != 'in_progress':
                return schedule, 'not_in_progress', []

            unresolved = []
            for participant in cls.get_participants(schedule):
                latest = participant.attendance_logs.first()
                resolved_absent = (
                    latest
                    and latest.attendance_stage == 'departure'
                    and latest.participant_status in {'absent', 'cancelled'}
                )
                resolved_return = (
                    latest
                    and latest.attendance_stage == 'return'
                    and latest.participant_status in {'returned', 'early_return'}
                )
                if not resolved_absent and not resolved_return:
                    unresolved.append(participant.id)
            if unresolved:
                return schedule, 'unresolved_participants', unresolved

            schedule.status = 'completed'
            schedule.actual_ended_at = timezone.now()
            schedule.trip_report = report
            schedule.save(update_fields=[
                'status', 'actual_ended_at', 'trip_report', 'updated_at',
            ])
            TripFieldEvent.objects.filter(schedule_id=schedule.id, kind='position').delete()
            return schedule, 'finished', []
