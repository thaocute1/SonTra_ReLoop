import uuid
from datetime import timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from .serializers.guide_trip_serializers import AttendanceCreateSerializer
from .services.guide_trip_service import GuideTripService
from .views.field_views import FieldEventInput
from .views.field_views import paid_trip_items
from types import SimpleNamespace


class FieldValidationTests(SimpleTestCase):
    """No database or demo records are created by these checks."""

    def test_position_requires_consent_and_capture_time(self):
        serializer = FieldEventInput(data={
            'request_id': str(uuid.uuid4()), 'kind': 'position',
            'latitude': 16, 'longitude': 108,
        })
        self.assertFalse(serializer.is_valid())

    def test_reject_future_gps(self):
        serializer = FieldEventInput(data={
            'request_id': str(uuid.uuid4()), 'kind': 'position', 'consent': True,
            'latitude': 16, 'longitude': 108,
            'captured_at': timezone.now() + timedelta(hours=1),
        })
        self.assertFalse(serializer.is_valid())

    def test_handover_requires_note(self):
        serializer = AttendanceCreateSerializer(data={
            'participant_id': 1, 'attendance_stage': 'return',
            'participant_status': 'early_return',
        })
        self.assertFalse(serializer.is_valid())

    def test_checkpoint_cannot_be_return_status(self):
        serializer = AttendanceCreateSerializer(data={
            'participant_id': 1, 'checkpoint_id': 3,
            'attendance_stage': 'checkpoint', 'participant_status': 'returned',
        })
        self.assertFalse(serializer.is_valid())

    def test_query_uses_correct_columns_for_cancellation_and_refund(self):
        sql, params = GuideTripService.confirmed_participants().query.sql_with_params()
        self.assertNotIn('canceled', params)
        self.assertIn('cancelled', params)
        self.assertIn('refunded', params)
        self.assertIn('"refund_status"', sql)
        self.assertNotIn(' IN ', sql)

    def test_legacy_bookings_do_not_require_participant_rows(self):
        sql, params = paid_trip_items(SimpleNamespace(id=123)).query.sql_with_params()
        self.assertNotIn('tour_participants', sql)
        self.assertNotIn('canceled', params)
        self.assertIn('"refund_status"', sql)
