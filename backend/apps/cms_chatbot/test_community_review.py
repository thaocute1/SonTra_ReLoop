from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from .services.community_service import CommunityService


class CommunityReviewTests(SimpleTestCase):
    def test_approve_records_points_via_ledger_and_locks_rows(self):
        author = SimpleNamespace(id=7, role='customer', name='Du Khach', total_eco_points=100, refresh_from_db=Mock(), save=Mock())
        post = SimpleNamespace(
            id=12,
            title='Nhat rac Bai Nam',
            status='draft',
            collected_kg=2.5,
            author_id=7,
            author=author,
            save=Mock(),
        )
        module = 'apps.cms_chatbot.services.community_service.'

        with ExitStack() as stack:
            posts = stack.enter_context(patch(module + 'Posts'))
            users = stack.enter_context(patch(module + 'Users'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            atomic = stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))

            posts.objects.select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = post
            users.objects.select_for_update.return_value.get.return_value = author
            ledger.objects.filter.return_value.exists.return_value = False

            result = CommunityService.review_post(post_id=12, action='approve')

        atomic.assert_called_once()
        posts.objects.select_for_update.assert_called_once()
        users.objects.select_for_update.assert_called_once()
        ledger.objects.create.assert_called_once()
        self.assertEqual(ledger.objects.create.call_args.kwargs['points_change'], 25)
        self.assertEqual(ledger.objects.create.call_args.kwargs['reference_type'], 'community_post_cleanup')
        self.assertEqual(ledger.objects.create.call_args.kwargs['rate_snapshot']['post_id'], 12)
        author.save.assert_not_called()
        author.refresh_from_db.assert_called_once()
        self.assertEqual(result['points_awarded'], 25)
        self.assertEqual(post.status, 'published')

    def test_approve_already_published_post_raises_and_awards_no_points(self):
        author = SimpleNamespace(id=7, role='customer', name='Du Khach', total_eco_points=100)
        post = SimpleNamespace(
            id=12,
            title='Nhat rac Bai Nam',
            status='published',
            collected_kg=2.5,
            author_id=7,
            author=author,
            save=Mock(),
        )
        module = 'apps.cms_chatbot.services.community_service.'

        with ExitStack() as stack:
            posts = stack.enter_context(patch(module + 'Posts'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            posts.objects.select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = post

            with self.assertRaisesMessage(ValueError, 'đã được phê duyệt'):
                CommunityService.review_post(post_id=12, action='approve')

        ledger.objects.create.assert_not_called()
        post.save.assert_not_called()

    def test_reapprove_after_restore_does_not_duplicate_ledger_reward(self):
        author = SimpleNamespace(id=7, role='customer', name='Du Khach', total_eco_points=125, refresh_from_db=Mock(), save=Mock())
        post = SimpleNamespace(
            id=12,
            title='Nhat rac Bai Nam',
            status='draft',
            collected_kg=2.5,
            author_id=7,
            author=author,
            save=Mock(),
        )
        module = 'apps.cms_chatbot.services.community_service.'

        with ExitStack() as stack:
            posts = stack.enter_context(patch(module + 'Posts'))
            users = stack.enter_context(patch(module + 'Users'))
            ledger = stack.enter_context(patch(module + 'PointsLedger'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            posts.objects.select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = post
            users.objects.select_for_update.return_value.get.return_value = author
            ledger.objects.filter.return_value.exists.return_value = True

            result = CommunityService.review_post(post_id=12, action='approve')

        ledger.objects.create.assert_not_called()
        author.save.assert_not_called()
        self.assertEqual(result['points_awarded'], 0)
        self.assertEqual(post.status, 'published')
