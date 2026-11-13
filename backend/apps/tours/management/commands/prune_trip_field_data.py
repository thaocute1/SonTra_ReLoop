from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.tours.models.field_event import TripFieldEvent


class Command(BaseCommand):
    help = 'Delete GPS after 24 hours and support/notice/receipt data after 90 days.'

    def handle(self, *args, **options):
        now = timezone.now()
        positions, _ = TripFieldEvent.objects.filter(kind='position', updated_at__lt=now - timedelta(hours=24)).delete()
        other, _ = TripFieldEvent.objects.exclude(kind='position').filter(created_at__lt=now - timedelta(days=90)).delete()
        self.stdout.write(f'Deleted {positions} positions and {other} older events.')
