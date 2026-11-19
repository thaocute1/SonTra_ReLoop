import jwt
import os
import uuid
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.accounts.models.user_models import Users

class SupabaseJWTAuthentication(BaseAuthentication):
    """
    Custom DRF Authentication class to decode Supabase JWT & Django Backend JWT tokens.
    Extracts sub/user_id/email from JWT and maps to Django public.users model.
    """
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        parts = auth_header.split(' ', 1)
        token = parts[1].strip() if len(parts) > 1 else ''
        if not token:
            raise AuthenticationFailed('Thiếu Bearer token xác thực.')

        # TokenService signs application tokens with the Supabase secret when it
        # is configured, otherwise with Django's SECRET_KEY. Authentication must
        # use the exact same fallback or freshly-issued login tokens are rejected.
        jwt_secret = os.getenv('SUPABASE_JWT_SECRET') or settings.SECRET_KEY

        try:
            # Decode JWT token
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=['HS256'],
                options={"verify_aud": False}
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Phiên đăng nhập đã hết hạn.')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Token xác thực không hợp lệ.')

        if payload.get('token_type') == 'refresh':
            raise AuthenticationFailed('Không thể sử dụng refresh token để gọi API.')

        sub = payload.get('sub')
        user_id = payload.get('user_id')
        email = payload.get('email')

        user = None

        # 1. Try finding by auth_id if sub is a valid UUID
        if sub:
            try:
                uuid_obj = uuid.UUID(str(sub))
                user = Users.objects.filter(auth_id=uuid_obj, status='active', deleted_at__isnull=True).first()
            except (ValueError, TypeError):
                pass

        # 2. Try finding by user_id or sub if sub is numeric
        if not user and user_id:
            user = Users.objects.filter(id=user_id, status='active', deleted_at__isnull=True).first()

        if not user and sub and str(sub).isdigit():
            user = Users.objects.filter(id=int(sub), status='active', deleted_at__isnull=True).first()

        # 3. Try finding by email
        if not user and email:
            user = Users.objects.filter(email__iexact=email, status='active', deleted_at__isnull=True).first()

        if not user:
            raise AuthenticationFailed('Tài khoản không tồn tại hoặc đã bị khóa.')

        return (user, token)
