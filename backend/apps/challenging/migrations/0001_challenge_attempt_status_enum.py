from django.db import migrations


def add_challenge_attempt_status_values(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "ALTER TYPE public.challenge_attempt_status ADD VALUE IF NOT EXISTS 'pending_review'"
        )
        schema_editor.execute(
            "ALTER TYPE public.challenge_attempt_status ADD VALUE IF NOT EXISTS 'rejected'"
        )


class Migration(migrations.Migration):
    # Enum values must be committed before application queries can use them.
    atomic = False

    dependencies = []

    operations = [
        migrations.RunPython(add_challenge_attempt_status_values, migrations.RunPython.noop),
    ]
