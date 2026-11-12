from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .models.challenge_models import ChallengeCheckpoints
from .views.challenge_views import MissionCompleteView


class MissionCompletionTests(SimpleTestCase):
    def test_checkpoint_model_uses_database_composite_key(self):
        self.assertEqual(ChallengeCheckpoints._meta.pk.field_names,
                         ('challenge_id', 'checkpoint_id'))
        sql = str(ChallengeCheckpoints.objects.all().query)
        self.assertNotIn('"challenge_checkpoints"."id"', sql)

    def _complete(self, completed=False):
        user = Mock(id=7, is_authenticated=True, total_eco_points=620)
        challenge = SimpleNamespace(id=3, title='Observation', reward_points=90,
            badge_name='Green', description='Observe', banner_url='', badge_icon_url='')
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
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            challenges.objects.get.return_value = challenge
            users.objects.select_for_update.return_value.get.return_value = user
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
