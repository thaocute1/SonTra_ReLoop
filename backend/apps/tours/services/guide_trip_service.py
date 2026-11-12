from django.db import transaction
from django.utils import timezone

from ..models.tour_models import (
    Checkpoints,
    TourAttendanceLogs,
    TourParticipants,
    TourSchedules,
)


class GuideTripService:
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
        return TourParticipants.objects.filter(
            tour_schedule=schedule,
        ).select_related('order_item').prefetch_related('attendance_logs')

    @classmethod
    def update_participant(cls, schedule, participant_id, data):
        participant = TourParticipants.objects.filter(
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
    def record_attendance(schedule, guide, data):
        participant = TourParticipants.objects.filter(
            id=data['participant_id'],
            tour_schedule=schedule,
        ).first()
        if not participant:
            raise ValueError('Không tìm thấy thành viên trong chuyến này.')

        checkpoint = None
        checkpoint_id = data.get('checkpoint_id')
        if checkpoint_id:
            checkpoint = Checkpoints.objects.filter(
                id=checkpoint_id,
                route__tour_id=schedule.tour_id,
            ).first()
            if not checkpoint:
                raise ValueError('Checkpoint không thuộc tuyến của chuyến này.')

        return TourAttendanceLogs.objects.create(
            participant=participant,
            checkpoint=checkpoint,
            attendance_stage=data['attendance_stage'],
            participant_status=data['participant_status'],
            confirmed_by_guide=guide,
            confirmed_at=timezone.now(),
            note=data.get('note'),
        )

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
            for participant in TourParticipants.objects.filter(tour_schedule=schedule).prefetch_related('attendance_logs'):
                latest = participant.attendance_logs.first()
                resolved_absent = (
                    latest
                    and latest.attendance_stage == 'departure'
                    and latest.participant_status == 'absent'
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
            return schedule, 'finished', []
