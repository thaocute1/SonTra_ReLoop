from contextlib import ExitStack, nullcontext
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from .services.flash_sale_service import FlashSaleService


class FlashSaleSecurityTests(SimpleTestCase):
    def test_get_active_session_does_not_mutate_db(self):
        live_session = Mock(status='upcoming')
        module = 'apps.flash_sales.services.flash_sale_service.'
        with ExitStack() as stack:
            sessions = stack.enter_context(patch(module + 'CampaignSessions'))
            serializer = stack.enter_context(patch(module + 'CampaignSessionDetailSerializer'))
            sessions.objects.filter.return_value.filter.return_value.order_by.return_value.first.return_value = live_session
            serializer.return_value.data = {'id': 1, 'status': 'upcoming'}

            result = FlashSaleService.get_active_session()

        live_session.save.assert_not_called()
        self.assertEqual(result['session']['status'], 'active')

    def test_register_tour_item_locks_campaign_and_vendor_against_race(self):
        now = timezone.now()
        campaign = SimpleNamespace(
            id=10,
            status='active',
            registration_deadline=now + timedelta(days=1),
            max_items_per_vendor=2,
        )
        session = SimpleNamespace(
            id=20,
            campaign_id=10,
            campaign=campaign,
            status='upcoming',
            end_time=now + timedelta(days=2),
        )
        vendor = SimpleNamespace(id=30)
        tour = SimpleNamespace(id=40, price=Decimal('500000.00'))

        module = 'apps.flash_sales.services.flash_sale_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            sessions = stack.enter_context(patch(module + 'CampaignSessions'))
            campaigns = stack.enter_context(patch(module + 'Campaigns'))
            vendors = stack.enter_context(patch(module + 'Vendors'))
            tours = stack.enter_context(patch(module + 'Tours'))
            items = stack.enter_context(patch(module + 'CampaignItems'))

            sessions.objects.select_related.return_value.filter.return_value.first.return_value = session
            campaigns.objects.select_for_update.return_value.get.return_value = campaign
            vendors.objects.select_for_update.return_value.filter.return_value.first.return_value = vendor
            tours.objects.filter.return_value.first.return_value = tour
            items.objects.select_for_update.return_value.filter.return_value.first.return_value = None
            items.objects.filter.return_value.count.return_value = 2

            with self.assertRaisesMessage(ValueError, 'giới hạn tour'):
                FlashSaleService.register_tour_item(
                    {'session_id': 20, 'tour_id': 40, 'promo_price': '350000', 'slot_quantity': 5},
                    SimpleNamespace(id=7),
                )

        campaigns.objects.select_for_update.assert_called_once()
        vendors.objects.select_for_update.assert_called_once()
        items.objects.create.assert_not_called()


class VendorFlashSaleRegistrationTests(TestCase):
    """Exercise real JWT authentication and registration rules on the test DB."""

    def setUp(self):
        from apps.accounts.models.user_models import Users
        from apps.accounts.services.token_service import TokenService
        from apps.vendors.models import Vendors
        from apps.tours.models import Tours
        from apps.flash_sales.models import Campaigns, CampaignSessions
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.owner = Users.objects.create(name='Vendor QA', role='vendor_admin')
        self.customer = Users.objects.create(name='Customer QA', role='customer')
        self.vendor = Vendors.objects.create(user=self.owner, brand_name='Vendor QA', status='approved')
        self.tour = Tours.objects.create(vendor=self.vendor, title='Tour QA', slug='flash-qa', price=450000, duration_hours=2, status='published')
        self.tokens = TokenService.generate_tokens_for_user(self.owner)
        now = timezone.now()
        campaign = Campaigns.objects.create(title='Campaign QA', registration_deadline=now + timedelta(days=1), status='active')
        session = CampaignSessions.objects.create(campaign=campaign, session_name='Session QA', start_time=now + timedelta(hours=1), end_time=now + timedelta(hours=2))
        self.payload = {'session_id': session.id, 'tour_id': self.tour.id, 'promo_price': 350000, 'slot_quantity': 10}
        self.url = '/api/v1/flash-sales/vendor/register-item/'

    def test_anonymous_registration_still_requires_authentication(self):
        from apps.flash_sales.models import CampaignItems
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response['WWW-Authenticate'], 'Bearer')
        self.assertFalse(CampaignItems.objects.exists())

    def test_vendor_access_token_registers_published_tour_pending_review(self):
        from apps.flash_sales.models import CampaignItems
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.tokens['access'])
        response = self.client.post(self.url, {**self.payload, 'vendor_id': 999999}, format='json')
        self.assertEqual(response.status_code, 201)
        item = CampaignItems.objects.get()
        self.assertEqual(item.vendor_id, self.vendor.id)
        self.assertEqual(item.status, 'pending_approval')

    def test_pending_tour_returns_business_error_not_authentication_error(self):
        from apps.flash_sales.models import CampaignItems
        self.tour.status = 'pending_approval'
        self.tour.save(update_fields=['status'])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.tokens['access'])
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('chưa được xuất bản', response.data['message'])
        self.assertFalse(CampaignItems.objects.exists())

    def test_customer_token_cannot_register_vendor_tour(self):
        from apps.accounts.services.token_service import TokenService
        from apps.flash_sales.models import CampaignItems
        token = TokenService.generate_tokens_for_user(self.customer)['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(CampaignItems.objects.exists())

    def test_refresh_token_cannot_be_used_to_register_tour(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.tokens['refresh'])
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 401)
