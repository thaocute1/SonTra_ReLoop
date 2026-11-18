from rest_framework.exceptions import ValidationError
from ..repositories.user_repository import UserRepository
from .token_service import TokenService
from .oauth_service import OAuthService

class AuthService:

    @staticmethod
    def register(name, email, password, phone=None, role='customer'):
        """Registers a new customer account and returns generated JWT tokens."""
        if not email or not password or not name:
            raise ValidationError({'error': 'Vui lòng điền đầy đủ Tên, Email và Mật khẩu.'})

        existing_user = UserRepository.get_by_email(email, include_inactive=True)
        if existing_user:
            raise ValidationError({'email': 'Email này đã được đăng ký trong hệ thống.'})

        user = UserRepository.create_user(
            name=name,
            email=email,
            raw_password=password,
            phone=phone,
            role='customer'
        )

        return TokenService.generate_tokens_for_user(user)

    @staticmethod
    def login(email, password):
        """Authenticates a user via email and password."""
        if not email or not password:
            raise ValidationError({'error': 'Vui lòng nhập đầy đủ Email và Mật khẩu.'})

        user = UserRepository.get_by_email(email, include_inactive=True)
        if not user:
            raise ValidationError({'error': 'Email hoặc mật khẩu không chính xác.'})

        if not user.check_password(password):
            raise ValidationError({'error': 'Email hoặc mật khẩu không chính xác.'})

        if user.status != 'active':
            raise ValidationError({'error': 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.'})

        return TokenService.generate_tokens_for_user(user)

    @classmethod
    def _authenticate_oauth_user(cls, email, name, avatar_url, fallback_name):
        """Finds or creates an OAuth user while rejecting locked or inactive accounts."""
        user = UserRepository.get_by_email(email, include_inactive=True)

        if not user:
            user = UserRepository.create_user(
                name=name or fallback_name,
                email=email,
                avatar_url=avatar_url,
                role='customer'
            )
        else:
            if user.status != 'active':
                raise ValidationError({'error': 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.'})

            updates = {}
            if avatar_url and user.avatar_url != avatar_url:
                updates['avatar_url'] = avatar_url
            if name and (user.name == email.split('@')[0] or not user.name):
                updates['name'] = name

            if updates:
                UserRepository.update_user(user, **updates)

        return TokenService.generate_tokens_for_user(user)

    @classmethod
    def login_with_google(cls, token_string):
        """Authenticates or creates a user using Google OAuth token."""
        google_payload = OAuthService.verify_google_token(token_string)
        email = google_payload.get('email')

        if not email:
            raise ValidationError({'error': 'Không thể lấy thông tin Email từ Google.'})

        return cls._authenticate_oauth_user(
            email=email,
            name=google_payload.get('name'),
            avatar_url=google_payload.get('avatar_url'),
            fallback_name=email.split('@')[0],
        )

    @classmethod
    def login_with_facebook(cls, access_token):
        """Authenticates or creates a user using Facebook OAuth access token."""
        fb_payload = OAuthService.verify_facebook_token(access_token)
        email = fb_payload.get('email')

        if not email:
            raise ValidationError({'error': 'Không thể lấy thông tin Email từ Facebook.'})

        return cls._authenticate_oauth_user(
            email=email,
            name=fb_payload.get('name'),
            avatar_url=fb_payload.get('avatar_url'),
            fallback_name='Facebook User',
        )
