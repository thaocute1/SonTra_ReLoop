from rest_framework import serializers

from ..models.tour_models import TourAttendanceLogs, TourParticipants


class TourParticipantSerializer(serializers.ModelSerializer):
    order_item_id = serializers.IntegerField(read_only=True)
    latest_attendance = serializers.SerializerMethodField()
    attendance_logs = serializers.SerializerMethodField()

    class Meta:
        model = TourParticipants
        fields = [
            'id', 'order_item_id', 'participant_no', 'full_name', 'phone',
            'emergency_contact_name', 'emergency_contact_phone', 'special_notes',
            'latest_attendance',
            'attendance_logs',
        ]

    def get_latest_attendance(self, participant):
        log = participant.attendance_logs.first()
        if not log:
            return None
        return {
            'stage': log.attendance_stage,
            'status': log.participant_status,
            'checkpoint_id': log.checkpoint_id,
            'confirmed_at': log.confirmed_at,
            'note': log.note,
            'confirmed_by_guide_id': log.confirmed_by_guide_id,
        }

    def get_attendance_logs(self, participant):
        return [{
            'stage': log.attendance_stage, 'status': log.participant_status,
            'checkpoint_id': log.checkpoint_id, 'confirmed_at': log.confirmed_at,
            'confirmed_by_guide_id': log.confirmed_by_guide_id, 'note': log.note,
        } for log in participant.attendance_logs.all()]


class TourParticipantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourParticipants
        fields = [
            'full_name', 'phone', 'emergency_contact_name',
            'emergency_contact_phone', 'special_notes',
        ]


class AttendanceCreateSerializer(serializers.ModelSerializer):
    request_id = serializers.UUIDField(required=False)
    participant_id = serializers.IntegerField()
    checkpoint_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = TourAttendanceLogs
        fields = [
            'participant_id', 'attendance_stage', 'participant_status',
            'checkpoint_id', 'note',
            'request_id',
        ]

    def validate_attendance_stage(self, value):
        if value not in {'departure', 'checkpoint', 'return'}:
            raise serializers.ValidationError('Mốc điểm danh không hợp lệ.')
        return value

    def validate_participant_status(self, value):
        allowed = {'present', 'absent', 'late', 'cancelled', 'left_group', 'returned', 'early_return'}
        if value not in allowed:
            raise serializers.ValidationError('Trạng thái người tham gia không hợp lệ.')
        return value

    def validate(self, attrs):
        stage = attrs['attendance_stage']
        checkpoint_id = attrs.get('checkpoint_id')
        if stage == 'checkpoint' and not checkpoint_id:
            raise serializers.ValidationError({'checkpoint_id': 'Bắt buộc với điểm danh tại checkpoint.'})
        if stage != 'checkpoint' and checkpoint_id:
            raise serializers.ValidationError({'checkpoint_id': 'Chỉ dùng checkpoint cho mốc checkpoint.'})
        allowed_by_stage = {
            'departure': {'present', 'absent', 'late', 'cancelled'},
            'checkpoint': {'present', 'left_group'},
            'return': {'returned', 'early_return', 'left_group'},
        }
        if attrs['participant_status'] not in allowed_by_stage[stage]:
            raise serializers.ValidationError({
                'participant_status': 'Trạng thái không phù hợp với mốc điểm danh đã chọn.'
            })
        if attrs['participant_status'] in {'early_return', 'left_group'} and not (attrs.get('note') or '').strip():
            raise serializers.ValidationError({'note': 'Cần ghi tình trạng hoặc người nhận bàn giao.'})
        return attrs
