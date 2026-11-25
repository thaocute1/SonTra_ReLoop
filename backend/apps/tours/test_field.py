import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

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

    @patch('apps.tours.services.guide_trip_service.transaction.atomic')
    @patch('apps.tours.services.guide_trip_service.TripFieldEvent')
    @patch('apps.tours.services.guide_trip_service.OrderVendors')
    @patch('apps.tours.services.guide_trip_service.TourSchedules')
    def test_finish_trip_marks_order_vendors_completed(
        self, mock_schedules, mock_order_vendors, mock_field_event, mock_atomic,
    ):
        schedule = MagicMock(
            id=10,
            status='in_progress',
            actual_started_at=timezone.now(),
        )
        mock_schedules.objects.select_for_update.return_value.filter.return_value.first.return_value = schedule

        latest_log = SimpleNamespace(attendance_stage='return', participant_status='returned')
        attendance_logs = MagicMock()
        attendance_logs.first.return_value = latest_log
        participant = SimpleNamespace(
            id=1,
            order_item_id=101,
            order_item=SimpleNamespace(order_vendor_id=55),
            attendance_logs=attendance_logs,
        )

        with patch.object(GuideTripService, 'get_participants', return_value=[participant]):
            result_schedule, outcome, unresolved = GuideTripService.finish_trip(99, 10, 'Done')

        self.assertEqual(outcome, 'finished')
        self.assertEqual(unresolved, [])
        self.assertEqual(result_schedule.status, 'completed')
        mock_order_vendors.objects.filter.assert_called_once_with(id__in={55})
        exclude_call = mock_order_vendors.objects.filter.return_value.exclude
        exclude_call.assert_called_once_with(status__in=['cancelled', 'completed'])
        update_kwargs = exclude_call.return_value.update.call_args.kwargs
        self.assertEqual(update_kwargs['status'], 'completed')
        self.assertIn('updated_at', update_kwargs)
