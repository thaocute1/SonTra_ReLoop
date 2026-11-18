import jwt
import os
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

from ..repositories.user_repository import UserRepository


class TokenService:

    @staticmethod
    def _jwt_secret():
        return os.getenv('SUPABASE_JWT_SECRET') or settings.SECRET_KEY

    @staticmethod
    def _build_access_token(user, now=None):
        now = now or datetime.utcnow()
        access_payload = {
            'sub': str(user.auth_id) if user.auth_id else str(user.id),
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'aud': 'authenticated',
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(days=7)).timestamp()) # Access token valid for 7 days
        }
        return jwt.encode(access_payload, TokenService._jwt_secret(), algorithm='HS256')

    @staticmethod
    def generate_tokens_for_user(user):
        """
        Generates access_token and refresh_token for a given Users instance.
        Signed with SUPABASE_JWT_SECRET or SECRET_KEY so SupabaseJWTAuthentication works seamlessly.
        """
        jwt_secret = TokenService._jwt_secret()

        now = datetime.utcnow()
        access_token = TokenService._build_access_token(user, now=now)

        refresh_payload = {
            'sub': str(user.auth_id) if user.auth_id else str(user.id),
            'token_type': 'refresh',
            'user_id': user.id,
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(days=30)).timestamp()) # Refresh token valid for 30 days
        }

        refresh_token = jwt.encode(refresh_payload, jwt_secret, algorithm='HS256')

        return {
            'access': access_token,
            'refresh': refresh_token,
            'user': {
                'id': user.id,
                'auth_id': str(user.auth_id) if user.auth_id else None,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'avatar_url': user.avatar_url,
                'total_eco_points': user.total_eco_points,
                'role': user.role,
                'status': user.status
            }
        }

    @staticmethod
    def refresh_access_token(refresh_token):
        """
        Validates a refresh JWT and issues a fresh access token for the active user.
        """
        if not refresh_token:
            raise AuthenticationFailed('Thiếu refresh token.')

        try:
            payload = jwt.decode(
                refresh_token,
                TokenService._jwt_secret(),
                algorithms=['HS256'],
                options={'verify_aud': False}
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Refresh token không hợp lệ.')

        if payload.get('token_type') != 'refresh':
            raise AuthenticationFailed('Loại token không hợp lệ.')

        user_id = payload.get('user_id')
        user = UserRepository.get_by_id(user_id) if user_id else None
        if not user:
            raise AuthenticationFailed('Tài khoản không tồn tại hoặc đã bị khóa.')

        return {
            'access': TokenService._build_access_token(user),
        }
