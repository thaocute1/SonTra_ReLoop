import uuid
from django.db import transaction
from ..models.user_models import Users, Staffs

class StaffService:
    @staticmethod
    def create_staff(validated_data, creator_user=None):
        """
        Creates a new Staff user and corresponding Staffs table record atomically.
        """
        with transaction.atomic():
            raw_password = validated_data.pop('password')
            permissions = validated_data.pop('permissions', [])
            
            # 1. Create base User entry
            user = Users(
                auth_id=None,
                name=validated_data['name'],
                email=validated_data['email'],
                phone=validated_data.get('phone') or None,
                role='staff',
                status='active'
            )
            user.set_password(raw_password)
            user.save()

            # Fallback admin if creator_user is not authenticated
            admin_user = creator_user if (creator_user and getattr(creator_user, 'is_authenticated', False)) else (
                Users.objects.filter(role='system_admin').first() or Users.objects.first()
            )

            # 2. Create Staff specific profile record
            staff = Staffs(
                user=user,
                employee_code=validated_data['employee_code'],
                department=validated_data['department'],
                position=validated_data.get('position', ''),
                permissions=permissions,
                created_by_admin=admin_user
            )
            staff.save()

            return staff

    @staticmethod
    def get_all_staffs():
        """
        Returns all staff entries with related user pre-fetched.
        """
        return Staffs.objects.select_related('user').all().order_by('-id')
