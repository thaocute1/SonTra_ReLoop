from contextlib import ExitStack, nullcontext
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.tours.services.customer_review_admin_service import CustomerReviewAdminService
from apps.tours.views.tour_review_views import (
    AdminCustomerReviewModerateView,
    AdminCustomerReviewsListView,
)


class AdminCustomerReviewAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_requires_bql_role_for_list_and_moderate(self):
        for role in (None, 'customer', 'vendor_admin'):
            with self.subTest(role=role):
                req = self.factory.get('/api/v1/tours/admin/customer-reviews/')
                if role:
                    force_authenticate(req, user=SimpleNamespace(id=10, role=role, is_authenticated=True))
                resp = AdminCustomerReviewsListView.as_view()(req)
                self.assertIn(resp.status_code, (401, 403))

                post_req = self.factory.post(
                    '/api/v1/tours/admin/customer-reviews/1/moderate/',
                    {'action': 'approve'},
                    format='json',
                )
                if role:
                    force_authenticate(post_req, user=SimpleNamespace(id=10, role=role, is_authenticated=True))
                post_resp = AdminCustomerReviewModerateView.as_view()(post_req, review_id=1)
                self.assertIn(post_resp.status_code, (401, 403))

    @patch('apps.tours.views.tour_review_views.CustomerReviewAdminService.list_reviews')
    def test_bql_user_can_list_reviews(self, list_mock):
        list_mock.return_value = {'summary': {'all_count': 1}, 'results': [{'id': 1}]}
        req = self.factory.get('/api/v1/tours/admin/customer-reviews/', {'tab': 'reported'})
        force_authenticate(req, user=SimpleNamespace(id=1, role='system_admin', is_authenticated=True))
        resp = AdminCustomerReviewsListView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data']['results'], [{'id': 1}])
        list_mock.assert_called_once_with(
            tab='reported', vendor_id=None, tour_id=None, rating=None, search='',
        )


class CustomerReviewAdminServiceTests(SimpleTestCase):
    def test_list_reviews_computes_counts_tabs_and_flagged_watchlist(self):
        vendor = SimpleNamespace(
            id=5,
            brand_name='Son Tra Eco',
            avg_rating=Decimal('3.20'),
            total_reviews=4,
        )
        tour = SimpleNamespace(
            id=9,
            title='Đỉnh Bàn Cờ',
            vendor_id=5,
            vendor=vendor,
            avg_rating=Decimal('2.80'),
            total_reviews=3,
        )
        rev_pending = SimpleNamespace(
            id=1,
            status='pending_approval',
            rating=5,
            comment='Liên hệ 0905123456',
            images=[],
            tour_id=9,
            tour=tour,
            vendor_id=5,
            vendor=vendor,
            guide_id=None,
            guide=None,
            order_vendor_id=21,
            order_vendor=SimpleNamespace(order=SimpleNamespace(order_code='ORD-001')),
            customer=SimpleNamespace(name='Nguyễn An', email='an@example.com'),
            created_at=datetime(2026, 11, 20, 10, 0),
        )
        rev_reported = SimpleNamespace(
            id=2,
            status='approved',
            rating=1,
            comment='Dịch vụ quá tệ',
            images=[{
                'type': 'review_meta',
                'guide_rating': 2,
                'low_rating_reasons': ['Trễ giờ'],
                'reports': [{'user_id': 7, 'role': 'vendor_admin', 'reason': 'Sai sự thật', 'created_at': '21/11/2026 08:00'}],
            }],
            tour_id=9,
            tour=tour,
            vendor_id=5,
            vendor=vendor,
            guide_id=None,
            guide=None,
            order_vendor_id=22,
            order_vendor=SimpleNamespace(order=SimpleNamespace(order_code='ORD-002')),
            customer=SimpleNamespace(name='Trần Bình', email='binh@example.com'),
            created_at=datetime(2026, 11, 21, 7, 30),
        )

        module = 'apps.tours.services.customer_review_admin_service.'
        with ExitStack() as stack:
            reviews_cls = stack.enter_context(patch(module + 'Reviews'))
            tours_cls = stack.enter_context(patch(module + 'Tours'))
            vendors_cls = stack.enter_context(patch(module + 'Vendors'))

            reviews_cls.objects.select_related.return_value.order_by.return_value = [rev_pending, rev_reported]
            tours_cls.objects.filter.return_value.select_related.return_value.order_by.return_value = [tour]
            vendors_cls.objects.filter.return_value.order_by.return_value = [vendor]

            reported_res = CustomerReviewAdminService.list_reviews(tab='reported')

        self.assertEqual(reported_res['summary']['pending_approval_count'], 1)
        self.assertEqual(reported_res['summary']['reported_count'], 1)
        self.assertEqual(reported_res['summary']['attention_count'], 2)
        self.assertEqual(reported_res['summary']['flagged_tours_count'], 1)
        self.assertEqual(reported_res['flagged_tours'][0]['quality_level'], 'critical')
        self.assertEqual(reported_res['flagged_vendors'][0]['quality_level'], 'warning')
        self.assertEqual(len(reported_res['results']), 1)
        self.assertEqual(reported_res['results'][0]['id'], 2)
        self.assertEqual(reported_res['results'][0]['reports_count'], 1)

    def test_moderate_review_approve_updates_status_syncs_ratings_and_awards_points_once(self):
        actor = SimpleNamespace(id=1, role='system_admin')
        customer = SimpleNamespace(id=44, name='Khách Test', email='khach@example.com')
        vendor = SimpleNamespace(id=5, brand_name='Son Tra Eco')
        tour = SimpleNamespace(id=9, title='Đỉnh Bàn Cờ', avg_rating=Decimal('0.00'), total_reviews=0)
        tour.save = Mock()

        rev = SimpleNamespace(
            id=1,
            status='pending_approval',
            rating=5,
            comment='Tuyệt vời',
            images=[],
            tour_id=9,
            tour=tour,
            vendor_id=5,
            vendor=vendor,
            guide_id=None,
            guide=None,
            order_vendor_id=21,
            order_vendor=SimpleNamespace(id=21, order=SimpleNamespace(order_code='ORD-001')),
            customer_id=44,
            customer=customer,
            created_at=datetime(2026, 11, 20, 10, 0),
        )
        rev.save = Mock()

        module = 'apps.tours.services.customer_review_admin_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            reviews_cls = stack.enter_context(patch(module + 'Reviews'))
            tours_cls = stack.enter_context(patch(module + 'Tours'))
            ledger_cls = stack.enter_context(patch(module + 'PointsLedger'))
            notif_cls = stack.enter_context(patch(module + 'Notifications'))
            sync_mock = stack.enter_context(patch(module + 'TourService._sync_vendor_and_guide_ratings'))

            reviews_cls.objects.select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = rev
            reviews_cls.objects.filter.return_value.aggregate.return_value = {'avg': 5.0, 'cnt': 1}
            tours_cls.objects.select_for_update.return_value.filter.return_value.first.return_value = tour
            ledger_cls.objects.filter.return_value.exists.return_value = False

            updated = CustomerReviewAdminService.moderate_review(1, actor, 'approve', note='Nội dung hợp lệ')

        self.assertEqual(rev.status, 'approved')
        self.assertEqual(updated['status'], 'approved')
        self.assertEqual(updated['moderation_note'], 'Nội dung hợp lệ')
        sync_mock.assert_called_once_with(5, None)
        ledger_cls.objects.create.assert_called_once()
        notif_cls.objects.create.assert_called_once()

    def test_moderate_review_reject_requires_reason_and_hides_review(self):
        actor = SimpleNamespace(id=1, role='staff')
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            CustomerReviewAdminService.moderate_review(1, actor, 'reject', note='')
