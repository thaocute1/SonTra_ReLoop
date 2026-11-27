from contextlib import ExitStack, contextmanager
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.db.models.expressions import CombinedExpression
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .services.reward_service import RewardService


class RewardRedemptionTests(SimpleTestCase):
    def test_redeem_locks_voucher_inside_atomic_and_uses_f_expression(self):
        now = timezone.now()
        events = []

        @contextmanager
        def tracking_atomic():
            events.append('enter_atomic')
            try:
                yield
            finally:
                events.append('exit_atomic')

        voucher = SimpleNamespace(
            pk=10,
            id=10,
            title='Voucher Xanh',
            effective_from=now - timedelta(days=1),
            effective_to=now + timedelta(days=1),
            quantity_total=5,
            quantity_redeemed=2,
            per_user_limit=2,
            points_required=100,
            refresh_from_db=Mock(),
        )
        user = SimpleNamespace(id=7, total_eco_points=300, refresh_from_db=Mock())
        module = 'apps.gamification.services.reward_service.'

        with ExitStack() as stack:
            vouchers = stack.enter_context(patch(module + 'Vouchers'))
            users = stack.enter_context(patch(module + 'Users'))
            user_vouchers = stack.enter_context(patch(module + 'UserVouchers'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=tracking_atomic))

            def lock_voucher(*args, **kwargs):
                events.append('voucher_select_for_update')
                qs = Mock()
                qs.get.return_value = voucher
                return qs

            vouchers.objects.select_for_update.side_effect = lock_voucher
            users.objects.select_for_update.return_value.get.return_value = user
            user_vouchers.objects.filter.return_value.count.return_value = 0
            issued = SimpleNamespace(id=55)
            user_vouchers.objects.create.return_value = issued
            ledger.objects.create.return_value = SimpleNamespace(id=99)

            result = RewardService.redeem_reward(user_obj=user, voucher_id=10)

        self.assertTrue(result['success'])
        self.assertLess(events.index('enter_atomic'), events.index('voucher_select_for_update'))
        self.assertLess(events.index('voucher_select_for_update'), events.index('exit_atomic'))
        update_kwargs = vouchers.objects.filter.return_value.update.call_args.kwargs
        self.assertIsInstance(update_kwargs['quantity_redeemed'], CombinedExpression)
        voucher.refresh_from_db.assert_called_once()
        user.refresh_from_db.assert_called_once()

    def test_redeem_rejects_sold_out_voucher_after_lock(self):
        now = timezone.now()
        voucher = SimpleNamespace(
            pk=10,
            id=10,
            title='Voucher Xanh',
            effective_from=now - timedelta(days=1),
            effective_to=now + timedelta(days=1),
            quantity_total=5,
            quantity_redeemed=5,
            per_user_limit=2,
            points_required=100,
        )
        user = SimpleNamespace(id=7, total_eco_points=300)
        module = 'apps.gamification.services.reward_service.'

        with ExitStack() as stack:
            vouchers = stack.enter_context(patch(module + 'Vouchers'))
            users = stack.enter_context(patch(module + 'Users'))
            stack.enter_context(patch(module + 'transaction.atomic'))
            vouchers.objects.select_for_update.return_value.get.return_value = voucher
            users.objects.select_for_update.return_value.get.return_value = user

            with self.assertRaises(ValidationError):
                RewardService.redeem_reward(user_obj=user, voucher_id=10)


class ConservationDonationDbTests(SimpleTestCase):
    def test_donate_projects_get_returns_list(self):
        from rest_framework.test import APIRequestFactory
        from .views.reward_views import ConservationDonateView

        req = APIRequestFactory().get('/api/v1/gamification/rewards/donate/')
        resp = ConservationDonateView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data['projects']), 3)


class ConservationDonationPersistenceTests(TestCase):
    def test_post_donate_creates_ledger_and_rejects_insufficient_points(self):
        from rest_framework.test import APIClient
        from apps.accounts.models.user_models import Users
        from apps.accounts.services.token_service import TokenService
        from apps.orders.models.order_models import UserVouchers
        from apps.gamification.models.gamification_models import PointsLedger

        user = Users.objects.create(name='Donor QA', role='customer', email='donor@test.local', total_eco_points=120)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + TokenService.generate_tokens_for_user(user)['access'])

        # 200 pts required -> 400
        fail_resp = client.post('/api/v1/gamification/rewards/donate/', {'project_code': 'DONATE-VOOC-200'}, format='json')
        self.assertEqual(fail_resp.status_code, 400)

        # 100 pts required -> 201
        ok_resp = client.post('/api/v1/gamification/rewards/donate/', {'project_code': 'DONATE-TREE-100'}, format='json')
        self.assertEqual(ok_resp.status_code, 201)
        self.assertTrue(PointsLedger.objects.filter(user=user, reference_type='conservation_donation', points_change=-100).exists())
        self.assertTrue(UserVouchers.objects.filter(user=user, voucher__code='DONATE-TREE-100').exists())
