from contextlib import ExitStack, nullcontext
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
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
