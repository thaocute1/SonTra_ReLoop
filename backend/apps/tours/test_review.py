from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models.user_models import Users
from apps.accounts.models.notification_models import Notifications
from apps.accounts.services.token_service import TokenService
from apps.vendors.models import Vendors
from apps.flash_sales.models import Campaigns, CampaignSessions, CampaignItems
from apps.flash_sales.services.flash_sale_service import FlashSaleService
from apps.orders.models import Orders
from apps.payments.models import PaymentTransactions, LedgerEntries
from .models import Tours, Routes, Checkpoints, TourSchedules
from .services.tour_service import TourService


class TourReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Users.objects.create(name='Admin QA', role='system_admin')
        self.staff = Users.objects.create(name='BQL QA', role='staff')
        self.owner = Users.objects.create(name='Vendor QA', role='vendor_admin')
        self.vendor = Vendors.objects.create(user=self.owner, brand_name='Green QA', status='approved')
        self.tour = Tours.objects.create(vendor=self.vendor, title='Pending QA', slug='pending-qa',
                                         price=450000, duration_hours=2, status='pending_approval')
        self.queue_url = '/api/v1/tours/admin/review-queue/'
        self.detail_url = f'/api/v1/tours/admin/{self.tour.id}/'
        self.review_url = self.detail_url + 'review/'

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + TokenService.generate_tokens_for_user(user)['access'])

    def test_only_admin_and_staff_can_read_and_review(self):
        for role in (None, 'customer', 'vendor_admin', 'guide'):
            if role:
                user = Users.objects.create(name='Blocked QA', role=role)
                self.authenticate(user)
            else:
                self.client.credentials()
            for method, path in [('get', self.queue_url), ('get', self.detail_url), ('post', self.review_url)]:
                with self.subTest(role=role, method=method):
                    response = getattr(self.client, method)(path, {'action': 'approve'}, format='json')
                    self.assertEqual(response.status_code, 401 if role is None else 403)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'pending_approval')
        self.assertFalse(Notifications.objects.exists())
        for user in (self.admin, self.staff):
            self.authenticate(user)
            self.assertEqual(self.client.get(self.queue_url).status_code, 200)
            self.assertEqual(self.client.get(self.detail_url).status_code, 200)

    def test_queue_filters_searches_counts_and_excludes_deleted_records(self):
        self.authenticate(self.admin)
        Tours.objects.create(vendor=self.vendor, title='Published QA', slug='published-qa', price=450000, duration_hours=2, status='published')
        Tours.objects.create(vendor=self.vendor, title='Deleted QA', slug='deleted-qa', price=450000, duration_hours=2, status='pending_approval', deleted_at=timezone.now())
        response = self.client.get(self.queue_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['metrics'], {'pending_approval': 1, 'published': 1, 'rejected': 0, 'all': 2})
        self.assertEqual([row['id'] for row in response.data['results']], [self.tour.id])
        self.assertEqual(response.data['results'][0]['vendor_name'], 'Green QA')
        published = self.client.get(self.queue_url, {'status': 'published', 'search': 'Green'})
        self.assertEqual(published.data['count'], 1)
        self.assertEqual(published.data['results'][0]['status'], 'published')
        self.assertEqual(self.client.get(self.queue_url, {'search': 'unmatched'}).data['count'], 0)
        self.assertEqual(self.client.get(self.queue_url, {'status': 'invalid'}).status_code, 400)

    def test_detail_reuses_route_checkpoints_and_departures(self):
        route = Routes.objects.create(tour=self.tour, start_latitude=16.10, start_longitude=108.20,
                                      end_latitude=16.11, end_longitude=108.21, total_distance_km=4)
        Checkpoints.objects.create(route=route, name='Start QA', latitude=16.10, longitude=108.20, order_index=1)
        TourSchedules.objects.create(tour=self.tour, departure_date=timezone.localdate() + timedelta(days=1), price=450000)
        self.authenticate(self.staff)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['route']['total_distance_km'], 4)
        self.assertEqual(response.data['data']['checkpoints'][0]['name'], 'Start QA')
        self.assertEqual(len(response.data['data']['schedules']), 1)

    def test_approval_publishes_records_reviewer_and_unlocks_existing_flash_registration(self):
        self.authenticate(self.staff)
        response = self.client.post(self.review_url, {'action': 'approve', 'approved_by_admin_id': self.owner.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'published')
        self.assertEqual(self.tour.approved_by_admin_id, self.staff.id)
        self.assertIsNotNone(self.tour.approved_at)
        self.assertEqual(response.data['data']['approved_by_name'], self.staff.name)
        self.assertEqual(Notifications.objects.filter(user=self.owner, notification_type='system').count(), 1)
        self.assertIn(self.tour.id, [row['id'] for row in TourService.get_published_tours()])
        now = timezone.now()
        campaign = Campaigns.objects.create(title='Sale QA', registration_deadline=now + timedelta(days=1), status='active')
        session = CampaignSessions.objects.create(campaign=campaign, session_name='Session QA', start_time=now, end_time=now + timedelta(hours=1))
        result = FlashSaleService.register_tour_item({'session_id': session.id, 'tour_id': self.tour.id,
                                                     'promo_price': 350000, 'slot_quantity': 10}, self.owner)
        self.assertEqual(result['status'], 'pending_approval')
        self.assertEqual(CampaignItems.objects.get().vendor_id, self.vendor.id)
        self.assertEqual(Orders.objects.count(), 0)
        self.assertEqual(PaymentTransactions.objects.count(), 0)
        self.assertEqual(LedgerEntries.objects.count(), 0)

    def test_rejection_requires_reason_and_is_visible_to_vendor(self):
        self.authenticate(self.admin)
        for reason in (None, '', '   '):
            response = self.client.post(self.review_url, {'action': 'reject', **({'reason': reason} if reason is not None else {})}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertFalse(Notifications.objects.exists())
        response = self.client.post(self.review_url, {'action': 'reject', 'reason': 'Bổ sung tuyến GPS.'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'rejected')
        self.assertEqual(self.tour.rejection_reason, 'Bổ sung tuyến GPS.')
        self.assertEqual(TourService.get_vendor_tours(self.vendor.id)[0]['rejection_reason'], 'Bổ sung tuyến GPS.')
        self.assertIn('Bổ sung tuyến GPS.', Notifications.objects.get().body)
        self.assertEqual(TourService.get_published_tours(), [])

    def test_duplicate_or_stale_review_never_overwrites_another_decision(self):
        self.authenticate(self.admin)
        self.assertEqual(self.client.post(self.review_url, {'action': 'approve'}, format='json').status_code, 200)
        self.tour.refresh_from_db()
        first_time = self.tour.approved_at
        self.authenticate(self.staff)
        for action in ('approve', 'reject'):
            response = self.client.post(self.review_url, {'action': action, 'reason': 'Changed QA'}, format='json')
            self.assertEqual(response.status_code, 409)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'published')
        self.assertEqual(self.tour.approved_by_admin_id, self.admin.id)
        self.assertEqual(self.tour.approved_at, first_time)
        self.assertEqual(Notifications.objects.count(), 1)

    def test_unapproved_vendor_or_locked_owner_cannot_publish(self):
        self.authenticate(self.admin)
        self.vendor.status = 'pending_approval'
        self.vendor.save(update_fields=['status'])
        self.assertEqual(self.client.post(self.review_url, {'action': 'approve'}, format='json').status_code, 400)
        self.vendor.status = 'approved'
        self.vendor.save(update_fields=['status'])
        self.owner.status = 'locked'
        self.owner.save(update_fields=['status'])
        self.assertEqual(self.client.post(self.review_url, {'action': 'approve'}, format='json').status_code, 400)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, 'pending_approval')
        self.assertFalse(Notifications.objects.exists())

    def test_missing_and_deleted_tours_cannot_be_reviewed(self):
        self.authenticate(self.admin)
        self.tour.deleted_at = timezone.now()
        self.tour.save(update_fields=['deleted_at'])
        self.assertEqual(self.client.get(self.detail_url).status_code, 404)
        self.assertEqual(self.client.post(self.review_url, {'action': 'approve'}, format='json').status_code, 404)
        self.assertFalse(Notifications.objects.exists())
