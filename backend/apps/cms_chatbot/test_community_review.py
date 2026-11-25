from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase

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


class NotificationStateTests(SimpleTestCase):
    def test_apply_notification_user_states_filters_dismissed_and_marks_read(self):
        user = SimpleNamespace(id=42, is_authenticated=True)
        items = [
            {'id': 'notif-ord-1', 'is_unread': True},
            {'id': 'notif-db-9', 'is_unread': True, 'is_read': False},
            {'id': 'notif-bql-3', 'is_unread': True},
        ]

        with patch('apps.cms_chatbot.services.community_service.NotificationUserState') as state_model:
            state_model.objects.filter.return_value.values.return_value = [
                {'notification_key': 'notif-ord-1', 'is_read': True, 'is_dismissed': False},
                {'notification_key': 'notif-bql-3', 'is_read': True, 'is_dismissed': True},
            ]
            result = CommunityService._apply_notification_user_states(items, user)

        self.assertEqual(len(result), 2)
        self.assertTrue(result[0]['is_read'])
        self.assertFalse(result[0]['is_unread'])
        self.assertFalse(result[1]['is_read'])
        self.assertTrue(result[1]['is_unread'])

    def test_mark_notifications_read_updates_db_and_user_state(self):
        user = SimpleNamespace(id=42, is_authenticated=True)

        with ExitStack() as stack:
            state_model = stack.enter_context(patch('apps.cms_chatbot.services.community_service.NotificationUserState'))
            notif_model = stack.enter_context(patch('apps.accounts.models.notification_models.Notifications'))
            count = CommunityService.mark_notifications_read(
                user=user,
                notification_ids=['notif-db-15', 'notif-ord-7'],
                mark_all=False,
            )

        self.assertEqual(count, 2)
        notif_model.objects.filter.assert_called_once()
        notif_model.objects.filter.return_value.update.assert_called_once()
        self.assertEqual(state_model.objects.update_or_create.call_count, 2)


class CommunityInteractionsDbTests(TestCase):
    def test_like_and_comment_persist_on_published_post(self):
        from apps.accounts.models.user_models import Users
        from apps.cms_chatbot.models.cms_models import Posts

        user = Users.objects.create(name='Community User', role='customer', email='comm@test.local')
        post = Posts.objects.create(
            author=user,
            title='Dọn rác Sơn Trà',
            slug='don-rac-son-tra-qa',
            post_type='article',
            content='Nội dung chia sẻ',
            status='published',
        )

        like_res = CommunityService.toggle_like(post.id, user_id=user.id)
        self.assertTrue(like_res['is_liked'])
        comment_res = CommunityService.add_comment(post.id, 'Community User', 'Tuyệt vời quá!')
        self.assertEqual(comment_res['content'], 'Tuyệt vời quá!')

        feed = CommunityService.get_feed(current_user=user)
        matched = next(item for item in feed if item['id'] == post.id)
        self.assertTrue(matched['is_liked'])
        self.assertEqual(matched['comments_count'], 1)
        self.assertEqual(matched['comments'][0]['content'], 'Tuyệt vời quá!')

        unlike_res = CommunityService.toggle_like(post.id, user_id=user.id)
        self.assertFalse(unlike_res['is_liked'])
