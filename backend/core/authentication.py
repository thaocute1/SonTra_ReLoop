import jwt
import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

class SupabaseJWTAuthentication(BaseAuthentication):
    """
    Custom DRF Authentication class to decode Supabase JWT tokens.
    Extracts auth_id (sub) from JWT and maps to Django public.users model.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        jwt_secret = os.getenv('SUPABASE_JWT_SECRET')

        try:
            # Decode JWT token
            payload = jwt.decode(token, jwt_secret, algorithms=['HS256'], audience='authenticated')
            auth_id = payload.get('sub')
            
            if not auth_id:
                raise AuthenticationFailed('Invalid token payload: missing sub')

            # Fetch corresponding user from public.users using auth_id
            User = get_user_model()
            user = User.objects.filter(auth_id=auth_id, status='active', deleted_at__isnull=True).first()

            if not user:
                raise AuthenticationFailed('User not found or inactive')

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication error: {str(e)}')
