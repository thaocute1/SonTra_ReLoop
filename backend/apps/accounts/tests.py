import base64
import json
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.accounts.serializers.auth_serializers import RegisterSerializer
from apps.accounts.services.auth_service import AuthService
from apps.accounts.services.oauth_service import OAuthService
from apps.accounts.services.token_service import TokenService
from apps.accounts.views.auth_views import (
    AdminUserListView,
    AdminUserToggleStatusView,
    RegisterView,
)
from apps.accounts.views.staff_views import StaffManagementView
from apps.cms_chatbot.services.community_service import CommunityService
from apps.cms_chatbot.views.admin_incident_views import (
    AdminIncidentListView,
    AdminIncidentUpdateView,
)
from apps.cms_chatbot.views.community_views import (
    AdminPostListView,
    AdminPostReviewView,
    CommunityEventsView,
    CommunityPostCreateView,
    IncidentReportCreateView,
    NotificationListView,
)
from apps.gamification.views.reward_views import ESGMetricsAdminView
from apps.payments.views.admin_payment_views import (
    ConservationFundAdminView,
    ConservationFundAllocateView,
    RevenueReportAdminView,
)
from apps.tours.services.tour_service import TourService
from apps.vendors.services.trip_chat_service import TripChatService
from apps.vendors.views.vendor_views import (
    VendorApplicationReviewView,
    VendorApplicationsView,
    VendorBookingStatusUpdateView,
    VendorBookingsListView,
    VendorInboxTripsView,
    VendorTripChatMessagesView,
)


class OAuthLockedUserTests(SimpleTestCase):
    @patch('apps.accounts.services.auth_service.TokenService.generate_tokens_for_user')
    @patch('apps.accounts.services.auth_service.UserRepository.create_user')
    @patch('apps.accounts.services.auth_service.UserRepository.get_by_email')
    @patch('apps.accounts.services.auth_service.OAuthService.verify_google_token')
    def test_google_oauth_blocks_locked_user(self, verify_google, get_by_email, create_user, gen_tokens):
        verify_google.return_value = {'email': 'locked@example.com', 'name': 'Locked', 'avatar_url': ''}
        get_by_email.return_value = SimpleNamespace(id=5, email='locked@example.com', status='locked', name='Locked', avatar_url='')

        with self.assertRaises(ValidationError):
            AuthService.login_with_google('valid-google-token')

        get_by_email.assert_called_once_with('locked@example.com', include_inactive=True)
        create_user.assert_not_called()
        gen_tokens.assert_not_called()

    @patch('apps.accounts.services.auth_service.TokenService.generate_tokens_for_user')
    @patch('apps.accounts.services.auth_service.UserRepository.create_user')
    @patch('apps.accounts.services.auth_service.UserRepository.get_by_email')
    @patch('apps.accounts.services.auth_service.OAuthService.verify_facebook_token')
    def test_facebook_oauth_blocks_locked_user(self, verify_fb, get_by_email, create_user, gen_tokens):
        verify_fb.return_value = {'email': 'locked@example.com', 'name': 'Locked', 'avatar_url': ''}
        get_by_email.return_value = SimpleNamespace(id=6, email='locked@example.com', status='locked', name='Locked', avatar_url='')

        with self.assertRaises(ValidationError):
            AuthService.login_with_facebook('valid-fb-token')

        get_by_email.assert_called_once_with('locked@example.com', include_inactive=True)
        create_user.assert_not_called()
        gen_tokens.assert_not_called()

    @patch('apps.accounts.services.auth_service.UserRepository.create_user')
    @patch('apps.accounts.services.auth_service.UserRepository.get_by_email')
    def test_register_rejects_existing_locked_user(self, get_by_email, create_user):
        get_by_email.return_value = SimpleNamespace(id=7, email='locked@example.com', status='locked')

        with self.assertRaises(ValidationError):
            AuthService.register('Locked', 'locked@example.com', 'StrongPass123!')

        get_by_email.assert_called_once_with('locked@example.com', include_inactive=True)
        create_user.assert_not_called()


class SecuritySettingsTests(SimpleTestCase):
    def test_production_defaults_are_safe(self):
        self.assertFalse(settings.DEBUG)
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertNotIn('*', settings.ALLOWED_HOSTS)
        self.assertNotIn('django-insecure-', settings.SECRET_KEY)


def _make_forged_jwt(payload):
    header = base64.urlsafe_b64encode(json.dumps({'alg': 'none'}).encode()).decode().rstrip('=')
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    return f'{header}.{body}.'


class PrivilegeEscalationTests(SimpleTestCase):
    def test_register_serializer_forces_customer_role(self):
        serializer = RegisterSerializer(data={
            'email': 'attacker@example.com',
            'password': 'Password123!',
            'name': 'Attacker',
            'role': 'system_admin',
            'user_type': 'staff',
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['role'], 'customer')

    def test_register_view_passes_customer_role_only(self):
        request = APIRequestFactory().post('/api/v1/accounts/register/', {
            'email': 'attacker@example.com',
            'password': 'Password123!',
            'role': 'system_admin',
        }, format='json')
        with patch.object(AuthService, 'register', return_value={'access': 'tok'}) as reg:
            response = RegisterView.as_view()(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(reg.call_args.kwargs['role'], 'customer')

    def test_auth_service_register_ignores_privileged_role_argument(self):
        with patch('apps.accounts.services.auth_service.UserRepository.get_by_email', return_value=None), \
             patch('apps.accounts.services.auth_service.UserRepository.create_user') as create_user, \
             patch('apps.accounts.services.auth_service.TokenService.generate_tokens_for_user', return_value={'access': 'ok'}):
            AuthService.register('Admin Wannabe', 'admin2@example.com', 'Password123!', role='system_admin')
        self.assertEqual(create_user.call_args.kwargs['role'], 'customer')


class GoogleOAuthSecurityTests(SimpleTestCase):
    def test_rejects_when_google_client_id_not_configured(self):
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': '', 'VITE_GOOGLE_CLIENT_ID': ''}):
            with self.assertRaises(ValidationError):
                OAuthService.verify_google_token('some-token')

    def test_rejects_forged_unsigned_jwt_without_google_verification(self):
        forged = _make_forged_jwt({'email': 'sysadmin@sontra.vn', 'name': 'Admin'})
        fake_resp = Mock(status_code=401)
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': 'expected-client-id'}), \
             patch('apps.accounts.services.oauth_service.requests.get', return_value=fake_resp):
            with self.assertRaises(ValidationError):
                OAuthService.verify_google_token(forged)

    def test_rejects_unverified_google_email(self):
        fake_resp = Mock(status_code=200)
        fake_resp.json.return_value = {
            'email': 'user@example.com',
            'email_verified': False,
            'aud': 'expected-client-id',
        }
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': 'expected-client-id'}), \
             patch('apps.accounts.services.oauth_service.requests.get', return_value=fake_resp):
            with self.assertRaises(ValidationError):
                OAuthService.verify_google_token('some-token')

    def test_rejects_google_access_token_with_mismatched_audience(self):
        tokeninfo_resp = Mock(status_code=200)
        tokeninfo_resp.json.return_value = {
            'email': 'victim@example.com',
            'email_verified': 'true',
            'aud': 'attacker-client-id',
            'azp': 'attacker-client-id',
        }
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': 'expected-client-id'}), \
             patch('apps.accounts.services.oauth_service.requests.get', return_value=tokeninfo_resp):
            with self.assertRaises(ValidationError):
                OAuthService.verify_google_token('access-token-from-other-app')

    def test_rejects_google_id_token_with_mismatched_audience(self):
        tokeninfo_resp = Mock(status_code=200)
        tokeninfo_resp.json.return_value = {
            'email': 'victim@example.com',
            'email_verified': 'true',
            'aud': 'attacker-client-id',
        }
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': 'expected-client-id'}), \
             patch('apps.accounts.services.oauth_service.requests.get', return_value=tokeninfo_resp):
            with self.assertRaises(ValidationError):
                OAuthService.verify_google_token('header.payload.signature')

    def test_accepts_google_access_token_with_matching_audience(self):
        tokeninfo_resp = Mock(status_code=200)
        tokeninfo_resp.json.return_value = {
            'email': 'user@example.com',
            'email_verified': 'true',
            'aud': 'expected-client-id',
            'sub': 'google-sub-1',
        }
        userinfo_resp = Mock(status_code=200)
        userinfo_resp.json.return_value = {
            'name': 'Nguyen Van A',
            'picture': 'https://example.com/a.jpg',
        }
        with patch.dict(os.environ, {'GOOGLE_CLIENT_ID': 'expected-client-id'}), \
             patch('apps.accounts.services.oauth_service.requests.get', side_effect=[tokeninfo_resp, userinfo_resp]):
            payload = OAuthService.verify_google_token('valid-access-token')
        self.assertEqual(payload['email'], 'user@example.com')
        self.assertEqual(payload['name'], 'Nguyen Van A')


class FacebookOAuthSecurityTests(SimpleTestCase):
    def test_rejects_when_facebook_app_config_missing(self):
        with patch.dict(os.environ, {'FACEBOOK_APP_ID': '', 'VITE_FACEBOOK_APP_ID': '', 'FACEBOOK_APP_SECRET': '', 'FACEBOOK_APP_ACCESS_TOKEN': ''}):
            with self.assertRaises(ValidationError):
                OAuthService.verify_facebook_token('fb-token')

    def test_rejects_facebook_token_from_other_app(self):
        debug_resp = Mock(status_code=200)
        debug_resp.json.return_value = {'data': {'is_valid': True, 'app_id': 'other-app-id', 'user_id': '123'}}
        with patch.dict(os.environ, {'FACEBOOK_APP_ID': 'our-app-id', 'FACEBOOK_APP_SECRET': 'our-secret'}), \
             patch('apps.accounts.services.oauth_service.requests.get', return_value=debug_resp) as req_get:
            with self.assertRaises(ValidationError):
                OAuthService.verify_facebook_token('third-party-fb-token')
        self.assertEqual(req_get.call_count, 1)

    def test_accepts_facebook_token_matching_app_id(self):
        debug_resp = Mock(status_code=200)
        debug_resp.json.return_value = {'data': {'is_valid': True, 'app_id': 'our-app-id', 'user_id': '123'}}
        me_resp = Mock(status_code=200)
        me_resp.json.return_value = {
            'id': '123',
            'name': 'FB User',
            'email': 'fb@example.com',
            'picture': {'data': {'url': 'https://example.com/fb.jpg'}},
        }
        with patch.dict(os.environ, {'FACEBOOK_APP_ID': 'our-app-id', 'FACEBOOK_APP_SECRET': 'our-secret'}), \
             patch('apps.accounts.services.oauth_service.requests.get', side_effect=[debug_resp, me_resp]):
            payload = OAuthService.verify_facebook_token('valid-fb-token')
        self.assertEqual(payload['email'], 'fb@example.com')
        self.assertEqual(payload['sub'], '123')


class _DummyProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user_id': request.user.id})


class TokenAndJWTAuthenticationTests(SimpleTestCase):
    def _make_user(self):
        return SimpleNamespace(
            id=42,
            auth_id=None,
            email='jwt@example.com',
            role='customer',
            name='JWT User',
            phone='0905000000',
            avatar_url='',
            total_eco_points=0,
            status='active',
            is_authenticated=True,
        )

    def test_access_and_refresh_tokens_use_utc_timestamps(self):
        user = self._make_user()
        before = int(datetime.now(timezone.utc).timestamp())
        tokens = TokenService.generate_tokens_for_user(user)
        after = int(datetime.now(timezone.utc).timestamp())

        secret = TokenService._jwt_secret()
        access_payload = jwt.decode(tokens['access'], secret, algorithms=['HS256'], options={'verify_aud': False})
        refresh_payload = jwt.decode(tokens['refresh'], secret, algorithms=['HS256'], options={'verify_aud': False})

        self.assertEqual(access_payload['token_type'], 'access')
        self.assertEqual(refresh_payload['token_type'], 'refresh')
        self.assertTrue(before <= access_payload['iat'] <= after)
        self.assertEqual(access_payload['exp'] - access_payload['iat'], 7 * 86400)
        self.assertEqual(refresh_payload['exp'] - refresh_payload['iat'], 30 * 86400)

    def test_refresh_token_is_rejected_with_401_on_protected_api(self):
        user = self._make_user()
        tokens = TokenService.generate_tokens_for_user(user)
        req = APIRequestFactory().get('/api/protected/', HTTP_AUTHORIZATION=f"Bearer {tokens['refresh']}")
        resp = _DummyProtectedView.as_view()(req)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.get('WWW-Authenticate'), 'Bearer')

    def test_expired_or_invalid_bearer_token_returns_401_instead_of_403(self):
        expired = jwt.encode(
            {
                'sub': '42',
                'user_id': 42,
                'token_type': 'access',
                'exp': int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp()),
            },
            TokenService._jwt_secret(),
            algorithm='HS256',
        )
        for header in (f'Bearer {expired}', 'Bearer invalid.jwt.token', ''):
            kwargs = {'HTTP_AUTHORIZATION': header} if header else {}
            req = APIRequestFactory().get('/api/protected/', **kwargs)
            resp = _DummyProtectedView.as_view()(req)
            self.assertEqual(resp.status_code, 401)
            self.assertEqual(resp.get('WWW-Authenticate'), 'Bearer')

    def test_valid_access_token_authenticates_active_user(self):
        user = self._make_user()
        tokens = TokenService.generate_tokens_for_user(user)
        req = APIRequestFactory().get('/api/protected/', HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        with patch('core.authentication.Users.objects.filter') as users_filter:
            users_filter.return_value.first.return_value = user
            resp = _DummyProtectedView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['user_id'], 42)


class RBACPermissionTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _call(self, view_cls, method='get', path='/', data=None, role=None, **kwargs):
        req = getattr(self.factory, method)(path, data or {}, format='json')
        if role:
            user = SimpleNamespace(id=99, email='u@example.com', name='User', role=role, is_authenticated=True)
            force_authenticate(req, user=user)
        return view_cls.as_view()(req, **kwargs)

    def test_system_admin_only_endpoints_block_anonymous_customer_and_staff(self):
        cases = [
            (AdminUserListView, 'get', {}),
            (AdminUserToggleStatusView, 'post', {'pk': 1}),
            (StaffManagementView, 'get', {}),
            (StaffManagementView, 'post', {}),
            (ConservationFundAllocateView, 'post', {}),
        ]
        for view_cls, method, kwargs in cases:
            for role in (None, 'customer', 'vendor_admin', 'staff'):
                with self.subTest(view=view_cls.__name__, role=role):
                    resp = self._call(view_cls, method=method, role=role, **kwargs)
                    self.assertIn(resp.status_code, (401, 403))

    def test_bql_endpoints_block_anonymous_and_customer_and_vendor(self):
        cases = [
            (VendorApplicationsView, 'get', {}),
            (VendorApplicationReviewView, 'patch', {'pk': 1}),
            (ConservationFundAdminView, 'get', {}),
            (RevenueReportAdminView, 'get', {}),
            (AdminIncidentListView, 'get', {}),
            (AdminIncidentUpdateView, 'patch', {'incident_id': 'INC-1'}),
            (AdminIncidentUpdateView, 'delete', {'incident_id': 'INC-1'}),
            (ESGMetricsAdminView, 'get', {}),
            (AdminPostListView, 'get', {}),
            (AdminPostReviewView, 'patch', {'post_id': 1}),
            (CommunityEventsView, 'post', {}),
        ]
        for view_cls, method, kwargs in cases:
            for role in (None, 'customer', 'vendor_admin'):
                with self.subTest(view=view_cls.__name__, method=method, role=role):
                    resp = self._call(view_cls, method=method, role=role, **kwargs)
                    self.assertIn(resp.status_code, (401, 403))

    def test_vendor_booking_endpoints_block_anonymous_and_customer(self):
        for view_cls, method, kwargs in [
            (VendorBookingsListView, 'get', {}),
            (VendorBookingStatusUpdateView, 'patch', {'booking_id': '1'}),
        ]:
            for role in (None, 'customer'):
                with self.subTest(view=view_cls.__name__, role=role):
                    resp = self._call(view_cls, method=method, role=role, **kwargs)
                    self.assertIn(resp.status_code, (401, 403))

    def test_admin_cannot_toggle_own_status(self):
        admin = SimpleNamespace(id=5, role='system_admin', is_authenticated=True)
        req = self.factory.post('/api/v1/accounts/users/5/toggle-status/')
        force_authenticate(req, user=admin)
        with patch('apps.accounts.views.auth_views.Users.objects.get', return_value=admin):
            resp = AdminUserToggleStatusView.as_view()(req, pk=5)
        self.assertEqual(resp.status_code, 400)


class IDORAndCommunitySecurityTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_get_customer_bookings_always_applies_user_filter(self):
        user = SimpleNamespace(id=77, email='newuser@example.com', is_authenticated=True)
        mock_qs = MagicMock()
        mock_qs.select_related.return_value = mock_qs
        mock_qs.prefetch_related.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.distinct.return_value = mock_qs
        mock_qs.order_by.return_value = mock_qs
        mock_qs.__iter__.return_value = iter([])

        with patch('apps.tours.services.tour_service.OrderVendors.objects', mock_qs):
            result = TourService.get_customer_bookings(user=user)

        self.assertEqual(result, [])
        self.assertEqual(mock_qs.filter.call_count, 2)
        mock_qs.exists.assert_not_called()

    def test_get_customer_bookings_without_user_or_email_returns_empty(self):
        self.assertEqual(TourService.get_customer_bookings(user=None, email=None), [])

    def test_trip_chat_channels_does_not_fallback_to_demo_customer(self):
        mock_ov_qs = MagicMock()
        mock_ov_qs.filter.return_value = mock_ov_qs
        mock_ov_qs.select_related.return_value = mock_ov_qs
        mock_ov_qs.__iter__.return_value = iter([])

        with patch('apps.vendors.services.trip_chat_service.OrderVendors.objects', mock_ov_qs), \
             patch('apps.vendors.services.trip_chat_service.Users.objects.filter') as users_filter:
            trips = TripChatService.get_trip_channels(customer_id=888, email='zero@example.com')

        self.assertEqual(trips, [])
        users_filter.assert_not_called()

    def test_trip_chat_post_ignores_spoofed_sender_id_and_enforces_membership(self):
        user = SimpleNamespace(id=12, email='cust@example.com', role='customer', is_authenticated=True)
        req = self.factory.post('/api/v1/vendors/inbox/messages/', {
            'tour_id': 6,
            'scheduled_date': '2026-10-24',
            'content': 'Hello',
            'sender_id': 1,
        }, format='json')
        force_authenticate(req, user=user)

        with patch.object(TripChatService, 'user_can_access_trip', return_value=False):
            blocked = VendorTripChatMessagesView.as_view()(req)
        self.assertEqual(blocked.status_code, 403)

        # Each view call needs its own request; DRF already consumed the first body.
        req = self.factory.post('/api/v1/vendors/inbox/messages/', {
            'tour_id': 6,
            'scheduled_date': '2026-10-24',
            'content': 'Hello',
            'sender_id': 1,
        }, format='json')
        force_authenticate(req, user=user)
        with patch.object(TripChatService, 'user_can_access_trip', return_value=True), \
             patch.object(TripChatService, 'send_message', return_value={'id': 1}) as send_msg:
            allowed = VendorTripChatMessagesView.as_view()(req)
        self.assertEqual(allowed.status_code, 201)
        self.assertEqual(send_msg.call_args.kwargs['sender_id'], 12)

    def test_community_post_create_blocks_anonymous_and_prevents_bql_alert_bypass(self):
        anon_req = self.factory.post('/api/v1/cms-chatbot/community/posts/', {
            'title': 'Hi',
            'content': 'Test',
        }, format='json')
        anon_resp = CommunityPostCreateView.as_view()(anon_req)
        self.assertIn(anon_resp.status_code, (401, 403))

        with self.assertRaises(PermissionDenied):
            CommunityService.create_post(AnonymousUser(), {'title': 'Hi', 'content': 'Test'})

        customer = SimpleNamespace(
            id=55,
            name='Khách',
            email='khach@example.com',
            role='customer',
            is_authenticated=True,
        )
        fake_post = SimpleNamespace(
            id=10,
            post_type='article',
            title='Fake Alert',
            content='Body',
            thumbnail_url='https://example.com/a.jpg',
            collected_kg=0.0,
            status='draft',
            created_at=None,
        )
        with patch('apps.cms_chatbot.services.community_service.Posts.objects.create', return_value=fake_post) as create_mock:
            CommunityService.create_post(customer, {
                'title': 'Fake Alert',
                'content': 'Body',
                'post_type': 'bql_alert',
            })
        self.assertEqual(create_mock.call_args.kwargs['status'], 'draft')
        self.assertEqual(create_mock.call_args.kwargs['post_type'], 'article')

    def test_incidents_and_notifications_require_auth_and_ignore_spoofed_role(self):
        self.assertEqual(CommunityService.get_incidents(AnonymousUser()), [])
        self.assertEqual(CommunityService.get_notifications(role='admin', user=AnonymousUser()), [])

        anon_inc_resp = IncidentReportCreateView.as_view()(self.factory.get('/api/v1/cms-chatbot/community/incidents/'))
        self.assertIn(anon_inc_resp.status_code, (401, 403))

        customer = SimpleNamespace(id=33, email='c@example.com', role='customer', is_authenticated=True)
        notif_req = self.factory.get('/api/v1/cms-chatbot/community/notifications/', {'role': 'admin'})
        force_authenticate(notif_req, user=customer)
        with patch.object(CommunityService, 'get_notifications', return_value=[]) as get_notifs:
            notif_resp = NotificationListView.as_view()(notif_req)
        self.assertEqual(notif_resp.status_code, 200)
        self.assertEqual(notif_resp.data['role'], 'customer')
        self.assertEqual(get_notifs.call_args.kwargs['role'], 'customer')

    def test_inbox_trips_ignores_spoofed_customer_id_and_vendor_id_for_customer(self):
        customer = SimpleNamespace(id=44, email='me@example.com', role='customer', is_authenticated=True)
        req = self.factory.get('/api/v1/vendors/inbox/trips/', {'customer_id': 1, 'vendor_id': 2})
        force_authenticate(req, user=customer)
        with patch.object(TripChatService, 'get_trip_channels', return_value=[]) as get_channels:
            resp = VendorInboxTripsView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(get_channels.call_args.kwargs['customer_id'], 44)
        self.assertEqual(get_channels.call_args.kwargs['email'], 'me@example.com')
        self.assertIsNone(get_channels.call_args.kwargs['vendor_id'])
