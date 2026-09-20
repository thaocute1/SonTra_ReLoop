from rest_framework.exceptions import ValidationError
from apps.accounts.repositories.user_repository import UserRepository
from apps.accounts.services.token_service import TokenService
from apps.accounts.services.oauth_service import OAuthService

class AuthService:

    @staticmethod
    def register(name, email, password, phone=None, role='customer'):
        """Registers a new user and returns generated JWT tokens."""
        if not email or not password or not name:
            raise ValidationError({'error': 'Vui lòng điền đầy đủ Tên, Email và Mật khẩu.'})

        existing_user = UserRepository.get_by_email(email)
        if existing_user:
            raise ValidationError({'email': 'Email này đã được đăng ký trong hệ thống.'})

        user = UserRepository.create_user(
            name=name,
            email=email,
            raw_password=password,
            phone=phone,
            role=role
        )

        return TokenService.generate_tokens_for_user(user)

    @staticmethod
    def login(email, password):
        """Authenticates a user via email and password."""
        if not email or not password:
            raise ValidationError({'error': 'Vui lòng nhập đầy đủ Email và Mật khẩu.'})

        user = UserRepository.get_by_email(email)
        if not user:
            raise ValidationError({'error': 'Email hoặc mật khẩu không chính xác.'})

        if not user.check_password(password):
            raise ValidationError({'error': 'Email hoặc mật khẩu không chính xác.'})

        if user.status != 'active':
            raise ValidationError({'error': 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.'})

        return TokenService.generate_tokens_for_user(user)

    @staticmethod
    def login_with_google(token_string):
        """Authenticates or creates a user using Google OAuth token."""
        google_payload = OAuthService.verify_google_token(token_string)
        email = google_payload.get('email')

        if not email:
            raise ValidationError({'error': 'Không thể lấy thông tin Email từ Google.'})

        user = UserRepository.get_by_email(email)

        google_name = google_payload.get('name')
        google_avatar = google_payload.get('avatar_url')

        if not user:
            # Create a new user from Google profile
            user = UserRepository.create_user(
                name=google_name or email.split('@')[0],
                email=email,
                avatar_url=google_avatar,
                role='customer'
            )
        else:
            # Update user profile with real Google name & avatar if missing or temp
            updates = {}
            if google_avatar and user.avatar_url != google_avatar:
                updates['avatar_url'] = google_avatar
            if google_name and (user.name == email.split('@')[0] or not user.name):
                updates['name'] = google_name

            if updates:
                UserRepository.update_user(user, **updates)

        return TokenService.generate_tokens_for_user(user)

    @staticmethod
    def login_with_facebook(access_token):
        """Authenticates or creates a user using Facebook OAuth access token."""
        fb_payload = OAuthService.verify_facebook_token(access_token)
        email = fb_payload.get('email')

        user = UserRepository.get_by_email(email)

        fb_name = fb_payload.get('name')
        fb_avatar = fb_payload.get('avatar_url')

        if not user:
            # Create a new user from Facebook profile
            user = UserRepository.create_user(
                name=fb_name or 'Facebook User',
                email=email,
                avatar_url=fb_avatar,
                role='customer'
            )
        else:
            # Update avatar and name if missing
            updates = {}
            if fb_avatar and user.avatar_url != fb_avatar:
                updates['avatar_url'] = fb_avatar
            if fb_name and (user.name == email.split('@')[0] or not user.name):
                updates['name'] = fb_name

            if updates:
                UserRepository.update_user(user, **updates)

        return TokenService.generate_tokens_for_user(user)
