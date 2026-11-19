"""Run payment tests against ephemeral SQLite, never the configured Supabase DB."""
import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
from django.conf import settings
settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}


class NoMigrations:
    def __contains__(self, key):
        return True

    def __getitem__(self, key):
        return None


settings.MIGRATION_MODULES = NoMigrations()
import django
django.setup()
from django.apps import apps
from django.test.utils import get_runner
for model in apps.get_models():
    model._meta.managed = True
sys.exit(bool(get_runner(settings)(verbosity=2, interactive=False).run_tests(
    sys.argv[1:] or ['apps.payments.test_paypal'],
)))
