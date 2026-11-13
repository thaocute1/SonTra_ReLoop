from django.db import transaction

from apps.accounts.models.user_models import Users
from ..models.vendor_models import Guides, Vendors


class VendorGuideService:
    @staticmethod
    def list_guides(vendor_user_id):
        return Guides.objects.filter(
            vendor__user_id=vendor_user_id,
            vendor__deleted_at__isnull=True,
        ).select_related('user').order_by('-created_at')

    @staticmethod
    def list_teammates(guide_user_id):
        guide = Guides.objects.filter(
            user_id=guide_user_id,
            user__role='guide',
            user__status='active',
            user__deleted_at__isnull=True,
            vendor__deleted_at__isnull=True,
        ).only('vendor_id').first()
        if guide is None:
            return None
        return Guides.objects.filter(
            vendor_id=guide.vendor_id,
            user__role='guide',
            user__status='active',
            user__deleted_at__isnull=True,
        ).select_related('user', 'vendor').order_by('user__name', 'id')

    @staticmethod
    def create_guide(vendor_user_id, data):
        with transaction.atomic():
            vendor = Vendors.objects.select_for_update().filter(
                user_id=vendor_user_id,
                status='approved',
                deleted_at__isnull=True,
            ).first()
            if vendor is None:
                return None

            user = Users(
                name=data['name'].strip(),
                email=data['email'],
                phone=data.get('phone'),
                role='guide',
                status='active',
            )
            user.set_password(data['password'])
            user.save()

            return Guides.objects.create(
                vendor=vendor,
                user=user,
                license_number=data.get('license_number', '').strip(),
                languages=data.get('languages', []),
                experience_years=data.get('experience_years', 0),
            )
