import uuid
from apps.accounts.models.user_models import Users

class UserRepository:

    @staticmethod
    def get_by_id(user_id):
        return Users.objects.filter(id=user_id, status='active', deleted_at__isnull=True).first()

    @staticmethod
    def get_by_email(email):
        if not email:
            return None
        return Users.objects.filter(email__iexact=email.strip(), status='active', deleted_at__isnull=True).first()

    @staticmethod
    def get_by_auth_id(auth_id):
        if not auth_id:
            return None
        return Users.objects.filter(auth_id=auth_id, status='active', deleted_at__isnull=True).first()

    @staticmethod
    def create_user(name, email, raw_password=None, phone=None, avatar_url=None, role='customer', auth_id=None):
        user = Users(
            auth_id=auth_id, # Keep None if not linked to auth.users UUID
            name=name,
            email=email.strip().lower() if email else None,
            phone=phone if phone else None,
            avatar_url=avatar_url,
            role=role,
            status='active'
        )
        if raw_password:
            user.set_password(raw_password)
        user.save()
        return user

    @staticmethod
    def update_user(user, **kwargs):
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        user.save()
        return user
