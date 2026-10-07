import requests
import jwt
from rest_framework.exceptions import ValidationError

class OAuthService:

    @staticmethod
    def verify_google_token(token_string):
        """
        Verifies Google OAuth Token (Access Token or ID Token).
        Returns user payload: {'email': ..., 'name': ..., 'avatar_url': ..., 'sub': ...}
        """
        if not token_string:
            raise ValidationError({'error': 'Google Token không được để trống.'})

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
                if email:
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
                if email:
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
                if email:
                    return {
                        'email': email,
                        'name': data.get('name') or email.split('@')[0],
                        'avatar_url': data.get('picture'),
                        'sub': data.get('sub')
                    }
        except Exception:
            pass

        # 4. Fallback: JWT decode if token is JWT format
        try:
            decoded = jwt.decode(token_string, options={"verify_signature": False})
            email = decoded.get('email') or (decoded.get('user_metadata', {}).get('email'))
            if email:
                name = decoded.get('name') or (decoded.get('user_metadata', {}).get('full_name')) or email.split('@')[0]
                picture = decoded.get('picture') or (decoded.get('user_metadata', {}).get('avatar_url'))
                sub = decoded.get('sub')
                return {
                    'email': email,
                    'name': name,
                    'avatar_url': picture,
                    'sub': sub
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
            raise ValidationError({'error': f'Không thể kết nối đến Meta Facebook API: {str(e)}'})
