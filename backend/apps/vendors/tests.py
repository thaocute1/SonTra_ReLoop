from contextlib import ExitStack, nullcontext
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import Users
from .models import Vendors
from .serializers.vendor_serializers import VendorApplicationDetailSerializer
from .services.vendor_service import VendorService
from .views.vendor_views import (
    VendorApplicationDetailView,
    VendorApplicationReviewView,
    VendorCompanyProfileView,
    VendorDashboardView,
)


class VendorDashboardAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = VendorDashboardView.as_view()

    def get(self, role=None, **params):
        request = self.factory.get('/api/v1/vendors/dashboard/', params)
        if role:
            user = SimpleNamespace(id=17, role=role, is_authenticated=True)
            force_authenticate(request, user=user)
        return self.view(request)

    def test_rejects_anonymous_and_non_vendor_requests(self):
        for role in (None, 'customer', 'system_admin'):
            with self.subTest(role=role):
                self.assertIn(self.get(role, vendor_id=42).status_code, (401, 403))

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    @patch('apps.vendors.views.vendor_views.VendorService.get_vendor_dashboard')
    def test_uses_authenticated_vendor_for_report(self, dashboard, vendors):
        vendors.return_value.values_list.return_value.first.return_value = 23
        dashboard.return_value = {'vendor_info': {'id': 23}}
        response = self.get('vendor_admin', vendor_id=42, period='7d')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['vendor_info']['id'], 23)
        vendors.assert_called_once_with(user_id=17, deleted_at__isnull=True)
        dashboard.assert_called_once_with(23, '7d')

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_rejects_unknown_period(self, vendors):
        vendors.return_value.values_list.return_value.first.return_value = 23
        self.assertEqual(self.get('vendor_admin', period='custom').status_code, 400)

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_rejects_vendor_account_without_profile(self, vendors):
        vendors.return_value.values_list.return_value.first.return_value = None
        self.assertEqual(self.get('vendor_admin').status_code, 403)


class VendorCompanyProfileAccessTests(SimpleTestCase):
    def get(self, user=None):
        request = APIRequestFactory().get('/api/v1/vendors/profile/', {'vendor_id': 42})
        if user is not None:
            force_authenticate(request, user=user)
        return VendorCompanyProfileView.as_view()(request)

    def test_blocks_anonymous_and_customer_requests(self):
        self.assertIn(self.get().status_code, (401, 403))
        customer = SimpleNamespace(id=17, role='customer', is_authenticated=True)
        self.assertEqual(self.get(customer).status_code, 403)

    @patch('apps.vendors.views.vendor_views.Vendors.objects.filter')
    def test_only_returns_profile_owned_by_authenticated_account(self, vendors):
        owner = Users(id=17, email='vendor@example.test')
        vendor = Vendors(id=23, brand_name='Đối tác kiểm tra', user=owner)
        vendor.guides_count = 0
        vendor.initial_password = 'private'
        vendors.return_value.select_related.return_value.annotate.return_value.first.return_value = vendor
        user = SimpleNamespace(id=17, role='vendor_admin', is_authenticated=True)
        response = self.get(user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['id'], 23)
        self.assertEqual(response.data['data']['guides_count'], 0)
        self.assertNotIn('initial_password', response.data['data'])
        vendors.assert_called_once_with(user_id=17, deleted_at__isnull=True)


class VendorServiceAndReviewTests(SimpleTestCase):
    def test_register_vendor_uses_valid_model_fields_only(self):
        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            users = stack.enter_context(patch(module + 'Users'))
            vendors = stack.enter_context(patch(module + 'Vendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            users.objects.create.return_value = Mock()
            vendors.objects.create.return_value = SimpleNamespace(id=1, brand_name='Son Tra Eco')

            VendorService.register_vendor({
                'brand_name': 'Son Tra Eco',
                'email': 'partner@example.com',
                'phone': '0905111222',
                'business_license_code': 'BL-001',
                'password': 'StrongPassword123!',
            })

            create_kwargs = vendors.objects.create.call_args.kwargs
            valid_fields = {f.name for f in Vendors._meta.fields}
            self.assertTrue(set(create_kwargs).issubset(valid_fields))
            self.assertEqual(create_kwargs['commission_rate'], Decimal('0.1000'))
            self.assertNotIn('tax_number', create_kwargs)
            self.assertNotIn('profile_data', create_kwargs)

    def test_review_application_preserves_password_and_omits_initial_password(self):
        user = Users(id=11, email='partner@example.com', password_hash='existing-hash', status='unverified')
        user.save = Mock()
        user.set_password = Mock()
        vendor = Vendors(id=5, user=user, brand_name='Partner', status='pending_approval')
        vendor.save = Mock()

        module = 'apps.vendors.services.vendor_service.'
        with ExitStack() as stack:
            vendors = stack.enter_context(patch(module + 'Vendors'))
            stack.enter_context(patch(module + 'transaction.atomic', side_effect=nullcontext))
            vendors.objects.select_related.return_value.get.return_value = vendor

            updated = VendorService.review_application(5, 'approved')

        user.set_password.assert_not_called()
        self.assertEqual(user.status, 'active')
        serialized = VendorApplicationDetailSerializer(updated).data
        self.assertNotIn('initial_password', serialized)

    def test_application_detail_and_review_require_bql_and_call_existing_method(self):
        factory = APIRequestFactory()
        anon_req = factory.get('/api/v1/vendors/applications/5/')
        self.assertIn(VendorApplicationDetailView.as_view()(anon_req, pk=5).status_code, (401, 403))

        bql_user = SimpleNamespace(id=99, role='system_admin', is_authenticated=True)
        auth_req = factory.get('/api/v1/vendors/applications/5/')
        force_authenticate(auth_req, user=bql_user)
        with patch.object(VendorService, 'get_application_detail', return_value=None) as detail_mock:
            res = VendorApplicationDetailView.as_view()(auth_req, pk=5)
        self.assertEqual(res.status_code, 404)
        detail_mock.assert_called_once_with(5)

        patch_req = factory.patch('/api/v1/vendors/applications/5/review/', {'status': 'approved'}, format='json')
        force_authenticate(patch_req, user=bql_user)
        with patch.object(VendorService, 'get_application_detail', return_value=None) as detail_mock2:
            res2 = VendorApplicationReviewView.as_view()(patch_req, pk=5)
        self.assertEqual(res2.status_code, 404)
        detail_mock2.assert_called_once_with(5)
