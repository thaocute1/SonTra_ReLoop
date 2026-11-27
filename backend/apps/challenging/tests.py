from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .models.challenge_models import ChallengeAttempts, ChallengeCheckpoints
from .views.challenge_views import MissionCompleteView, MissionReviewView


class MissionCompletionTests(SimpleTestCase):
    def test_checkpoint_model_uses_database_composite_key(self):
        self.assertEqual(ChallengeCheckpoints._meta.pk.field_names,
                         ('challenge_id', 'checkpoint_id'))
        sql = str(ChallengeCheckpoints.objects.all().query)
        self.assertNotIn('"challenge_checkpoints"."id"', sql)

    def _complete(self, completed=False):
        user = Mock(id=7, is_authenticated=True, total_eco_points=620)
        challenge = SimpleNamespace(
            id=3, title='Observation', reward_points=90, mission_type='observation',
            tour_id=None, vendor=None, badge_name='Green', badge_description='',
            description='Observe', banner_url='', badge_icon_url='',
        )
        attempt = Mock(status='completed' if completed else 'in_progress')
        request = APIRequestFactory().post('/', {'note': 'Experience'}, format='json')
        force_authenticate(request, user=user)
        module = 'apps.challenging.views.challenge_views.'
        with ExitStack() as stack:
            challenges = stack.enter_context(patch(module + 'Challenges'))
            users = stack.enter_context(patch(module + 'Users'))
            attempts = stack.enter_context(patch(module + 'ChallengeAttempts'))
            checkpoints = stack.enter_context(patch(module + 'ChallengeCheckpoints'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'Badges'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            stack.enter_context(patch(module + 'transaction.set_rollback'))
            challenges.objects.get.return_value = challenge
            users.objects.select_for_update.return_value.get.return_value = user
            attempts.objects.filter.return_value.exists.side_effect = [completed, False]
            attempts.objects.get_or_create.return_value = (attempt, False)
            checkpoints.objects.filter.return_value.select_related.return_value.order_by.return_value.first.return_value = None
            response = MissionCompleteView.as_view()(request, pk=3)
        return response, ledger, user

    def test_completion_records_reward_and_evidence_snapshot(self):
        response, ledger, user = self._complete()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['new_total_points'], 620)
        self.assertEqual(ledger.objects.create.call_args.kwargs['points_change'], 90)
        self.assertEqual(ledger.objects.create.call_args.kwargs['rate_snapshot']['evidence']['note'], 'Experience')
        user.refresh_from_db.assert_called_once()

    def test_duplicate_does_not_award_points_again(self):
        response, ledger, _ = self._complete(completed=True)
        self.assertEqual(response.status_code, 400)
        ledger.objects.create.assert_not_called()

    def test_blocks_duplicate_completion_across_different_bookings(self):
        user = Mock(id=7, is_authenticated=True, total_eco_points=620)
        challenge = SimpleNamespace(
            id=3, title='GPS Trek', reward_points=90, mission_type='checkin_gps',
            tour_id=12, vendor=None, badge_name='Green', badge_description='',
            description='Trek', banner_url='', badge_icon_url='',
        )
        request = APIRequestFactory().post('/', {'order_vendor_id': 888}, format='json')
        force_authenticate(request, user=user)
        module = 'apps.challenging.views.challenge_views.'
        with ExitStack() as stack:
            challenges = stack.enter_context(patch(module + 'Challenges'))
            users = stack.enter_context(patch(module + 'Users'))
            attempts = stack.enter_context(patch(module + 'ChallengeAttempts'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            set_rollback = stack.enter_context(patch(module + 'transaction.set_rollback'))
            challenges.objects.get.return_value = challenge
            users.objects.select_for_update.return_value.get.return_value = user
            attempts.objects.filter.return_value.exists.return_value = True

            response = MissionCompleteView.as_view()(request, pk=3)

        self.assertEqual(response.status_code, 400)
        set_rollback.assert_called_once_with(True)
        attempts.objects.get_or_create.assert_not_called()
        ledger.objects.create.assert_not_called()

    def test_incomplete_checkin_gps_rolls_back_and_does_not_create_records(self):
        user = Mock(id=7, is_authenticated=True, total_eco_points=100)
        challenge = SimpleNamespace(
            id=3, title='GPS Trek', reward_points=90, mission_type='checkin_gps',
            tour_id=12, vendor=None, badge_name='Green', badge_description='',
            description='Trek', banner_url='', badge_icon_url='',
        )
        attempt = Mock(status='in_progress', order_vendor_id=55)
        request = APIRequestFactory().post('/', {'order_vendor_id': 55}, format='json')
        force_authenticate(request, user=user)
        module = 'apps.challenging.views.challenge_views.'
        with ExitStack() as stack:
            challenges = stack.enter_context(patch(module + 'Challenges'))
            users = stack.enter_context(patch(module + 'Users'))
            attempts = stack.enter_context(patch(module + 'ChallengeAttempts'))
            order_vendors = stack.enter_context(patch(module + 'OrderVendors'))
            order_items = stack.enter_context(patch(module + 'OrderItems'))
            checkpoints = stack.enter_context(patch(module + 'ChallengeCheckpoints'))
            checkin_logs = stack.enter_context(patch(module + 'CheckinLogs'))
            trash_subs = stack.enter_context(patch(module + 'EcoTrashSubmissions'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            set_rollback = stack.enter_context(patch(module + 'transaction.set_rollback'))

            challenges.objects.get.return_value = challenge
            users.objects.select_for_update.return_value.get.return_value = user
            attempts.objects.filter.return_value.exists.side_effect = [False, False]
            order_vendors.objects.filter.return_value.first.return_value = SimpleNamespace(id=55)
            order_items.objects.filter.return_value.exists.return_value = True
            attempts.objects.get_or_create.return_value = (attempt, True)
            checkpoints.objects.filter.return_value.select_related.return_value.order_by.return_value.first.return_value = None
            checkpoints.objects.filter.return_value.count.return_value = 2
            checkin_logs.objects.filter.return_value.count.return_value = 0

            response = MissionCompleteView.as_view()(request, pk=3)

        self.assertEqual(response.status_code, 400)
        set_rollback.assert_called_once_with(True)
        trash_subs.objects.create.assert_not_called()
        ledger.objects.create.assert_not_called()

    def test_mission_review_returns_404_on_missing_attempt(self):
        staff = SimpleNamespace(id=1, role='staff', is_authenticated=True)
        request = APIRequestFactory().post('/', {'decision': 'approved'}, format='json')
        force_authenticate(request, user=staff)
        module = 'apps.challenging.views.challenge_views.'
        with ExitStack() as stack:
            attempts = stack.enter_context(patch(module + 'ChallengeAttempts'))
            attempts.DoesNotExist = ChallengeAttempts.DoesNotExist
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            attempts.objects.select_for_update.return_value.select_related.return_value.get.side_effect = (
                ChallengeAttempts.DoesNotExist()
            )

            response = MissionReviewView.as_view()(request, pk=9999)

        self.assertEqual(response.status_code, 404)

    def test_non_numeric_order_vendor_id_returns_400_instead_of_500(self):
        user = Mock(id=7, is_authenticated=True, total_eco_points=100)
        challenge = SimpleNamespace(
            id=3, title='GPS Trek', reward_points=90, mission_type='checkin_gps',
            tour_id=12, vendor=None,
        )
        request = APIRequestFactory().post('/', {'order_vendor_id': 'invalid-id'}, format='json')
        force_authenticate(request, user=user)
        module = 'apps.challenging.views.challenge_views.'
        with ExitStack() as stack:
            challenges = stack.enter_context(patch(module + 'Challenges'))
            users = stack.enter_context(patch(module + 'Users'))
            attempts = stack.enter_context(patch(module + 'ChallengeAttempts'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            set_rollback = stack.enter_context(patch(module + 'transaction.set_rollback'))
            challenges.objects.get.return_value = challenge
            users.objects.select_for_update.return_value.get.return_value = user
            attempts.objects.filter.return_value.exists.return_value = False

            response = MissionCompleteView.as_view()(request, pk=3)

        self.assertEqual(response.status_code, 400)
        set_rollback.assert_called_once_with(True)


class AdminMissionManagementTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_non_bql_cannot_list_or_create_missions(self):
        from .views.admin_mission_views import AdminMissionListCreateView

        for role in (None, 'customer', 'vendor_admin'):
            with self.subTest(role=role):
                req = self.factory.post('/api/v1/challenging/missions/admin/', {'title': 'Test'}, format='json')
                if role:
                    force_authenticate(req, user=SimpleNamespace(id=5, role=role, is_authenticated=True))
                resp = AdminMissionListCreateView.as_view()(req)
                self.assertIn(resp.status_code, (401, 403))

    def test_admin_creates_eco_action_mission_auto_approved(self):
        from .views.admin_mission_views import AdminMissionListCreateView

        admin_user = SimpleNamespace(id=1, role='system_admin', is_authenticated=True)
        req = self.factory.post(
            '/api/v1/challenging/missions/admin/',
            {
                'title': 'Thu gom rác bãi Bụt',
                'description': 'Nhặt rác nhựa và chụp ảnh minh chứng.',
                'reward_points': 120,
                'mission_type': 'eco_action',
                'eco_activity_type': 'trash_pickup',
                'target_weight_kg': '2.5',
                'badge_name': 'Chiến binh Bãi Bụt',
            },
            format='json',
        )
        force_authenticate(req, user=admin_user)

        created_obj = SimpleNamespace(
            id=15,
            title='Thu gom rác bãi Bụt',
            description='Nhặt rác nhựa và chụp ảnh minh chứng.',
            banner_url='',
            reward_points=120,
            is_active=True,
            mission_type='eco_action',
            scope='open',
            eco_activity_type='trash_pickup',
            target_weight_kg=2.5,
            time_limit_minutes=None,
            badge_name='Chiến binh Bãi Bụt',
            badge_icon_url='',
            badge_description='',
            tour_id=None,
            tour=None,
            vendor_id=None,
            vendor=None,
            approval_status='approved',
            valid_from=None,
            valid_to=None,
            created_at=None,
        )

        module = 'apps.challenging.services.admin_mission_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            challenges_cls = stack.enter_context(patch(module + 'Challenges'))
            challenges_cls.objects.create.return_value = created_obj

            resp = AdminMissionListCreateView.as_view()(req)

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['id'], 15)
        self.assertEqual(resp.data['data']['approval_status'], 'approved')
        self.assertEqual(challenges_cls.objects.create.call_args.kwargs['approval_status'], 'approved')
        self.assertEqual(challenges_cls.objects.create.call_args.kwargs['scope'], 'open')

    def test_admin_toggles_and_soft_deletes_mission(self):
        from .views.admin_mission_views import AdminMissionDetailView

        admin_user = SimpleNamespace(id=1, role='staff', is_authenticated=True)
        challenge = SimpleNamespace(
            id=15,
            title='Thu gom rác',
            description='',
            banner_url='',
            reward_points=100,
            is_active=True,
            mission_type='eco_action',
            scope='open',
            eco_activity_type='trash_pickup',
            target_weight_kg=None,
            time_limit_minutes=None,
            badge_name='Huy hiệu Xanh',
            badge_icon_url='',
            badge_description='',
            tour_id=None,
            tour=None,
            vendor_id=None,
            vendor=None,
            approval_status='approved',
            valid_from=None,
            valid_to=None,
            deleted_at=None,
            created_at=None,
        )
        challenge.save = Mock()

        module = 'apps.challenging.services.admin_mission_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            challenges_cls = stack.enter_context(patch(module + 'Challenges'))
            challenges_cls.objects.filter.return_value.select_related.return_value.first.return_value = challenge
            challenges_cls.objects.filter.return_value.first.return_value = challenge

            patch_req = self.factory.patch('/api/v1/challenging/missions/admin/15/', {'is_active': False}, format='json')
            force_authenticate(patch_req, user=admin_user)
            patch_resp = AdminMissionDetailView.as_view()(patch_req, pk=15)
            self.assertEqual(patch_resp.status_code, 200)
            self.assertFalse(challenge.is_active)

            del_req = self.factory.delete('/api/v1/challenging/missions/admin/15/')
            force_authenticate(del_req, user=admin_user)
            del_resp = AdminMissionDetailView.as_view()(del_req, pk=15)
            self.assertEqual(del_resp.status_code, 200)
            self.assertIsNotNone(challenge.deleted_at)

    def test_tours_routes_queryset_uses_valid_relation_names(self):
        from apps.tours.models import Tours

        sql = str(
            Tours.objects.filter(deleted_at__isnull=True, status='published')
            .select_related('vendor', 'routes')
            .prefetch_related('routes__checkpoints')
            .query
        )
        self.assertIn('"routes"', sql)

    def test_checkin_gps_clears_target_weight_kg(self):
        from .views.admin_mission_views import AdminMissionListCreateView

        admin_user = SimpleNamespace(id=1, role='system_admin', is_authenticated=True)
        tour = SimpleNamespace(id=6, title='Đỉnh Bàn Cờ', vendor=SimpleNamespace(id=5, brand_name='Son Tra Eco'))
        req = self.factory.post(
            '/api/v1/challenging/missions/admin/',
            {
                'title': 'Check-in Trạm 2',
                'mission_type': 'checkin_gps',
                'tour_id': 6,
                'reward_points': 100,
                'target_weight_kg': 2,
                'checkpoint_ids': [],
            },
            format='json',
        )
        force_authenticate(req, user=admin_user)

        created_obj = SimpleNamespace(
            id=16,
            title='Check-in Trạm 2',
            description='',
            banner_url='',
            reward_points=100,
            is_active=True,
            mission_type='checkin_gps',
            scope='tour',
            eco_activity_type=None,
            target_weight_kg=None,
            time_limit_minutes=None,
            badge_name='Check-in Trạm 2',
            badge_icon_url='',
            badge_description='',
            tour_id=6,
            tour=tour,
            vendor_id=5,
            vendor=tour.vendor,
            approval_status='approved',
            valid_from=None,
            valid_to=None,
            created_at=None,
        )

        module = 'apps.challenging.services.admin_mission_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            tours_cls = stack.enter_context(patch(module + 'Tours'))
            challenges_cls = stack.enter_context(patch(module + 'Challenges'))
            tours_cls.objects.select_related.return_value.filter.return_value.first.return_value = tour
            challenges_cls.objects.create.return_value = created_obj

            resp = AdminMissionListCreateView.as_view()(req)

        self.assertEqual(resp.status_code, 201)
        self.assertIsNone(challenges_cls.objects.create.call_args.kwargs['target_weight_kg'])
