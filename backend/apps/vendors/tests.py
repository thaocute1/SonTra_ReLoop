from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import Users
from .models import Vendors
from .views.vendor_views import VendorCompanyProfileView, VendorDashboardView


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
