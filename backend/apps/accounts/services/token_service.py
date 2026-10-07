import jwt
import os
from datetime import datetime, timedelta
from django.conf import settings

class TokenService:

    @staticmethod
    def generate_tokens_for_user(user):
        """
        Generates access_token and refresh_token for a given Users instance.
        Signed with SUPABASE_JWT_SECRET or SECRET_KEY so SupabaseJWTAuthentication works seamlessly.
        """
        jwt_secret = os.getenv('SUPABASE_JWT_SECRET') or settings.SECRET_KEY
        
        now = datetime.utcnow()
        access_payload = {
            'sub': str(user.auth_id) if user.auth_id else str(user.id),
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'aud': 'authenticated',
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(days=7)).timestamp()) # Access token valid for 7 days
        }
        
        refresh_payload = {
            'sub': str(user.auth_id) if user.auth_id else str(user.id),
            'token_type': 'refresh',
            'user_id': user.id,
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(days=30)).timestamp()) # Refresh token valid for 30 days
        }

        access_token = jwt.encode(access_payload, jwt_secret, algorithm='HS256')
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
