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
    def verify_google_token(token_string):
        """
        Verifies Google OAuth Token (Access Token or ID Token) directly with Google.
        Returns user payload: {'email': ..., 'name': ..., 'avatar_url': ..., 'sub': ...}
        """
        if not token_string:
            raise ValidationError({'error': 'Google Token không được để trống.'})

        expected_client_id = os.getenv('GOOGLE_CLIENT_ID') or os.getenv('VITE_GOOGLE_CLIENT_ID')

        # 1. Primary: Try Google userinfo endpoint with Authorization Bearer header
        try:
            resp = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {token_string}'},
                timeout=8
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get('email')
                if email and OAuthService._is_email_verified(data):
                    name = data.get('name')
                    if not name and (data.get('given_name') or data.get('family_name')):
                        name = f"{data.get('given_name', '')} {data.get('family_name', '')}".strip()
                    if not name:
                        name = email.split('@')[0]

                    return {
                        'email': email,
                        'name': name,
                        'avatar_url': data.get('picture'),
                        'sub': data.get('sub')
                    }
        except Exception:
            pass

        # 2. Secondary: Try Google access_token via tokeninfo
        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'access_token': token_string},
                timeout=8
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get('email')
                if email and OAuthService._is_email_verified(data):
                    return {
                        'email': email,
                        'name': data.get('name') or email.split('@')[0],
                        'avatar_url': data.get('picture'),
                        'sub': data.get('sub') or data.get('user_id')
                    }
        except Exception:
            pass

        # 3. Tertiary: Try Google id_token via tokeninfo
        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': token_string},
                timeout=8
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get('email')
                aud_valid = (not expected_client_id) or (data.get('aud') == expected_client_id)
                if email and OAuthService._is_email_verified(data) and aud_valid:
                    return {
                        'email': email,
                        'name': data.get('name') or email.split('@')[0],
                        'avatar_url': data.get('picture'),
                        'sub': data.get('sub')
                    }
        except Exception:
            pass

        raise ValidationError({'error': 'Google Token không hợp lệ hoặc đã hết hạn.'})

    @staticmethod
    def verify_facebook_token(access_token):
        """
        Verifies Facebook Access Token via Meta Graph API.
        Returns user payload: {'email': ..., 'name': ..., 'avatar_url': ..., 'sub': ...}
        """
        if not access_token:
            raise ValidationError({'error': 'Facebook Token không được để trống.'})

        try:
            url = 'https://graph.facebook.com/v19.0/me'
            params = {
                'fields': 'id,name,email,picture.type(large)',
                'access_token': access_token
            }
            resp = requests.get(url, params=params, timeout=8)
            if resp.status_code != 200:
                raise ValidationError({'error': f'Facebook Graph API Error: {resp.text}'})

            data = resp.json()
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
        except Exception as e:
            logger.exception("Facebook OAuth verification failed")
            raise ValidationError({'error': 'Không thể kết nối đến Meta Facebook API.'})
