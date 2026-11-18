import os
import requests
import logging
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

class OAuthService:

    @staticmethod
    def _is_email_verified(data):
        val = data.get('email_verified')
        if val is None:
            val = data.get('verified_email')
        return str(val).lower() == 'true'

    @staticmethod
    def _allowed_google_client_ids():
        raw = os.getenv('GOOGLE_CLIENT_ID') or os.getenv('VITE_GOOGLE_CLIENT_ID') or ''
        return {cid.strip() for cid in raw.split(',') if cid.strip()}

    @staticmethod
    def _google_audience_valid(data, allowed_client_ids, allow_azp=False):
        aud = data.get('aud')
        if aud and aud in allowed_client_ids:
            return True
        if allow_azp:
            azp = data.get('azp')
            if azp and azp in allowed_client_ids:
                return True
        return False

    @staticmethod
    def verify_google_token(token_string):
        """
        Verifies Google OAuth Token (Access Token or ID Token) directly with Google
        and enforces strict email verification + OAuth client audience matching.
        Returns user payload: {'email': ..., 'name': ..., 'avatar_url': ..., 'sub': ...}
        """
        if not token_string:
            raise ValidationError({'error': 'Google Token không được để trống.'})

        allowed_client_ids = OAuthService._allowed_google_client_ids()
        if not allowed_client_ids:
            raise ValidationError({'error': 'Chưa cấu hình Google Client ID trên máy chủ.'})

        is_jwt_like = str(token_string).count('.') == 2
        tokeninfo_order = (
            [('id_token', False), ('access_token', True)]
            if is_jwt_like
            else [('access_token', True), ('id_token', False)]
        )

        for param_name, allow_azp in tokeninfo_order:
            try:
                resp = requests.get(
                    'https://oauth2.googleapis.com/tokeninfo',
                    params={param_name: token_string},
                    timeout=8
                )
                if resp.status_code != 200:
                    continue
                data = resp.json()
                email = data.get('email')
                if (
                    email
                    and OAuthService._is_email_verified(data)
                    and OAuthService._google_audience_valid(data, allowed_client_ids, allow_azp=allow_azp)
                ):
                    name = data.get('name')
                    avatar_url = data.get('picture')
                    sub = data.get('sub') or data.get('user_id')

                    # For access tokens, enrich display name/avatar via userinfo only AFTER aud/azp verification.
                    if param_name == 'access_token' and (not name or not avatar_url):
                        try:
                            profile_resp = requests.get(
                                'https://www.googleapis.com/oauth2/v3/userinfo',
                                headers={'Authorization': f'Bearer {token_string}'},
                                timeout=8
                            )
                            if profile_resp.status_code == 200:
                                profile = profile_resp.json()
                                name = name or profile.get('name')
                                if not name and (profile.get('given_name') or profile.get('family_name')):
                                    name = f"{profile.get('given_name', '')} {profile.get('family_name', '')}".strip()
                                avatar_url = avatar_url or profile.get('picture')
                                sub = sub or profile.get('sub')
                        except Exception:
                            pass

                    return {
                        'email': email,
                        'name': name or email.split('@')[0],
                        'avatar_url': avatar_url,
                        'sub': sub
                    }
            except Exception:
                pass

        raise ValidationError({'error': 'Google Token không hợp lệ hoặc đã hết hạn.'})

    @staticmethod
    def verify_facebook_token(access_token):
        """
        Verifies Facebook Access Token via Meta /debug_token (App ID check) and /me.
        Returns user payload: {'email': ..., 'name': ..., 'avatar_url': ..., 'sub': ...}
        """
        if not access_token:
            raise ValidationError({'error': 'Facebook Token không được để trống.'})

        expected_app_id = (os.getenv('FACEBOOK_APP_ID') or os.getenv('VITE_FACEBOOK_APP_ID') or '').strip()
        app_secret = (os.getenv('FACEBOOK_APP_SECRET') or '').strip()
        app_access_token = (os.getenv('FACEBOOK_APP_ACCESS_TOKEN') or '').strip()
        if not app_access_token and expected_app_id and app_secret:
            app_access_token = f'{expected_app_id}|{app_secret}'

        if not expected_app_id or not app_access_token:
            raise ValidationError({'error': 'Chưa cấu hình Facebook App ID/Secret trên máy chủ.'})

        try:
            debug_resp = requests.get(
                'https://graph.facebook.com/v19.0/debug_token',
                params={
                    'input_token': access_token,
                    'access_token': app_access_token,
                },
                timeout=8
            )
            if debug_resp.status_code != 200:
                raise ValidationError({'error': 'Không thể xác minh Facebook Token với ứng dụng.'})

            debug_data = (debug_resp.json() or {}).get('data') or {}
            if (
                debug_data.get('is_valid') is not True
                or str(debug_data.get('app_id') or '') != str(expected_app_id)
            ):
                raise ValidationError({'error': 'Facebook Token không hợp lệ hoặc không thuộc ứng dụng.'})

            url = 'https://graph.facebook.com/v19.0/me'
            params = {
                'fields': 'id,name,email,picture.type(large)',
                'access_token': access_token
            }
            resp = requests.get(url, params=params, timeout=8)
            if resp.status_code != 200:
                raise ValidationError({'error': f'Facebook Graph API Error: {resp.text}'})

            data = resp.json()
            debug_user_id = debug_data.get('user_id')
            if debug_user_id and str(data.get('id') or '') != str(debug_user_id):
                raise ValidationError({'error': 'Facebook Token không khớp người dùng.'})

            email = data.get('email') or f"fb_{data.get('id')}@facebook.com"
            picture_url = data.get('picture', {}).get('data', {}).get('url')

            return {
                'email': email,
                'name': data.get('name') or 'Facebook User',
                'avatar_url': picture_url,
                'sub': data.get('id')
            }
        except ValidationError:
            raise
        except Exception:
            logger.exception("Facebook OAuth verification failed")
            raise ValidationError({'error': 'Không thể kết nối đến Meta Facebook API.'})
