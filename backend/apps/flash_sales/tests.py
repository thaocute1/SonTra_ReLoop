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
            sessions.objects.filter.return_value.order_by.return_value.first.return_value = live_session
            serializer.return_value.data = {'id': 1, 'status': 'upcoming'}

            result = FlashSaleService.get_active_session()

        live_session.save.assert_not_called()
        self.assertEqual(result['session']['status'], 'active')
        filter_kwargs = sessions.objects.filter.call_args.kwargs
        self.assertNotIn('campaign__registration_deadline__gt', filter_kwargs)

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


class FlashSaleTieredPricingAndAutoExtendTests(SimpleTestCase):
    def test_normalize_price_tiers_valid_and_invalid(self):
        from .services.pricing import normalize_price_tiers

        tiers, first_price, total_qty = normalize_price_tiers(
            [
                {'label': 'Bậc 1', 'quantity': 3, 'price': 300000},
                {'label': 'Bậc 2', 'quantity': 7, 'price': 380000},
            ],
            tour_price=Decimal('500000'),
        )
        self.assertEqual(first_price, Decimal('300000'))
        self.assertEqual(total_qty, 10)
        self.assertEqual(len(tiers), 2)
        self.assertEqual(tiers[0]['tier_index'], 1)
        self.assertEqual(tiers[1]['price'], 380000)

        with self.assertRaisesMessage(ValueError, 'cao hơn giá bậc trước'):
            normalize_price_tiers(
                [
                    {'quantity': 3, 'price': 380000},
                    {'quantity': 3, 'price': 350000},
                ],
                tour_price=Decimal('500000'),
            )

        with self.assertRaisesMessage(ValueError, 'thấp hơn giá niêm yết'):
            normalize_price_tiers(
                [{'quantity': 3, 'price': 500000}],
                tour_price=Decimal('500000'),
            )

    def test_compute_tier_state_advances_and_rolls_back_with_sold_quantity(self):
        from .services.pricing import compute_tier_state

        tiers = [
            {'tier_index': 1, 'label': 'Bậc 1', 'quantity': 3, 'price': 300000},
            {'tier_index': 2, 'label': 'Bậc 2', 'quantity': 5, 'price': 380000},
        ]
        item = SimpleNamespace(price_tiers=tiers, promo_price=300000, slot_quantity=8, sold_quantity=2)
        state = compute_tier_state(item)
        self.assertTrue(state['has_price_tiers'])
        self.assertEqual(state['current_tier']['tier_index'], 1)
        self.assertEqual(state['current_tier']['remaining_in_tier'], 1)
        self.assertEqual(state['next_tier']['price'], 380000)

        # Sold out tier 1 -> advances to tier 2
        item.sold_quantity = 3
        state = compute_tier_state(item)
        self.assertEqual(state['current_tier']['tier_index'], 2)
        self.assertEqual(state['current_tier']['remaining_in_tier'], 5)
        self.assertIsNone(state['next_tier'])

        # Order cancelled -> sold_quantity drops back to 2 -> tier 1 reopens automatically
        item.sold_quantity = 2
        state = compute_tier_state(item)
        self.assertEqual(state['current_tier']['tier_index'], 1)
        self.assertEqual(state['current_tier']['remaining_in_tier'], 1)

    def test_calculate_tiered_quote_splits_across_tiers(self):
        from .services.pricing import calculate_tiered_quote

        item = SimpleNamespace(
            price_tiers=[
                {'tier_index': 1, 'label': 'Bậc 1', 'quantity': 3, 'price': 300000},
                {'tier_index': 2, 'label': 'Bậc 2', 'quantity': 5, 'price': 380000},
            ],
            promo_price=300000,
            slot_quantity=8,
            sold_quantity=2,
        )
        quote = calculate_tiered_quote(item, adults_count=2, children_count=0)
        self.assertTrue(quote['crossed_tiers'])
        self.assertEqual(quote['grand_total'], 680000)
        self.assertEqual(len(quote['breakdown']), 2)
        self.assertEqual(quote['breakdown'][0]['quantity'], 1)
        self.assertEqual(quote['breakdown'][0]['unit_price'], 300000)
        self.assertEqual(quote['breakdown'][1]['quantity'], 1)
        self.assertEqual(quote['breakdown'][1]['unit_price'], 380000)

    def test_register_tour_item_respects_dynamic_pricing_enabled(self):
        now = timezone.now()
        campaign = SimpleNamespace(
            id=10, status='active', registration_deadline=now + timedelta(days=1), max_items_per_vendor=3,
        )
        session = SimpleNamespace(
            id=20, campaign_id=10, campaign=campaign, status='upcoming',
            end_time=now + timedelta(days=2), dynamic_pricing_enabled=False,
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
            sessions.objects.select_related.return_value.filter.return_value.first.return_value = session
            campaigns.objects.select_for_update.return_value.get.return_value = campaign
            vendors.objects.select_for_update.return_value.filter.return_value.first.return_value = vendor
            tours.objects.filter.return_value.first.return_value = tour

            with self.assertRaisesMessage(ValueError, 'chưa bật chế độ định giá theo bậc'):
                FlashSaleService.register_tour_item(
                    {
                        'session_id': 20,
                        'tour_id': 40,
                        'price_tiers': [{'quantity': 3, 'price': 300000}, {'quantity': 5, 'price': 380000}],
                    },
                    SimpleNamespace(id=7),
                )

    def test_maybe_auto_extend_session_extends_once_when_over_20_percent_remaining(self):
        now = timezone.now()
        end_time = now + timedelta(minutes=3)
        session = SimpleNamespace(
            id=55,
            auto_extend_enabled=True,
            extend_count=0,
            max_extend_minutes=30,
            status='active',
            start_time=now - timedelta(hours=1),
            end_time=end_time,
            campaign=SimpleNamespace(status='active'),
        )
        locked = SimpleNamespace(
            id=55,
            auto_extend_enabled=True,
            extend_count=0,
            max_extend_minutes=30,
            end_time=end_time,
            save=Mock(),
        )
        module = 'apps.flash_sales.services.flash_sale_service.'
        with ExitStack() as stack:
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            items = stack.enter_context(patch(module + 'CampaignItems'))
            sessions = stack.enter_context(patch(module + 'CampaignSessions'))
            items.objects.filter.return_value.aggregate.return_value = {'total_slots': 10, 'total_sold': 5}
            sessions.objects.select_for_update.return_value.filter.return_value.first.return_value = locked

            extended = FlashSaleService.maybe_auto_extend_session(session, now=now)

        self.assertTrue(extended)
        self.assertEqual(session.extend_count, 1)
        self.assertEqual(session.end_time, end_time + timedelta(minutes=30))
        locked.save.assert_called_once_with(update_fields=['end_time', 'extend_count', 'updated_at'])

        # Calling a second time must not extend again
        self.assertFalse(FlashSaleService.maybe_auto_extend_session(session, now=now))

    def test_maybe_auto_extend_session_skips_when_under_or_equal_20_percent_remaining(self):
        now = timezone.now()
        session = SimpleNamespace(
            id=56,
            auto_extend_enabled=True,
            extend_count=0,
            max_extend_minutes=30,
            status='active',
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(minutes=2),
            campaign=SimpleNamespace(status='active'),
        )
        module = 'apps.flash_sales.services.flash_sale_service.'
        with patch(module + 'CampaignItems') as items:
            items.objects.filter.return_value.aggregate.return_value = {'total_slots': 10, 'total_sold': 8}
            self.assertFalse(FlashSaleService.maybe_auto_extend_session(session, now=now))
        self.assertEqual(session.extend_count, 0)


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


class FlashSaleActiveSessionDbTests(TestCase):
    def test_get_active_session_remains_visible_after_registration_deadline(self):
        from .models import Campaigns, CampaignSessions
        now = timezone.now()
        campaign = Campaigns.objects.create(
            title='Flash Sale Past Reg',
            registration_deadline=now - timedelta(hours=2),
            status='active',
        )
        session = CampaignSessions.objects.create(
            campaign=campaign,
            session_name='Phiên 12h',
            start_time=now - timedelta(minutes=15),
            end_time=now + timedelta(minutes=45),
            status='active',
        )
        res = FlashSaleService.get_active_session()
        self.assertTrue(res['has_session'])
        self.assertEqual(res['session_type'], 'live')
        self.assertEqual(res['session']['id'], session.id)

    def test_create_campaign_honors_active_status_when_requested(self):
        deadline = timezone.now() + timedelta(days=2)
        created = FlashSaleService.create_campaign({
            'title': 'Active Campaign QA',
            'registration_deadline': deadline.isoformat(),
            'status': 'active',
        })
        self.assertEqual(created['status'], 'active')
