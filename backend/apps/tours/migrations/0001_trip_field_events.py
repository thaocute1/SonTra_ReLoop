import uuid
from django.db import migrations, models


def restrict_direct_access(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('ALTER TABLE trip_field_events ENABLE ROW LEVEL SECURITY')


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.CreateModel(
        name='TripFieldEvent',
        fields=[
            ('id', models.BigAutoField(primary_key=True, serialize=False)),
            ('schedule_id', models.BigIntegerField(db_index=True)),
            ('user_id', models.BigIntegerField()),
            ('participant_id', models.BigIntegerField(null=True, blank=True)),
            ('request_id', models.UUIDField(default=uuid.uuid4, unique=True)),
            ('kind', models.CharField(max_length=20)),
            ('status', models.CharField(max_length=20, default='received')),
            ('payload', models.JSONField(default=dict)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('updated_at', models.DateTimeField(auto_now=True)),
        ],
        options={'db_table': 'trip_field_events', 'ordering': ['created_at', 'id']},
    ), migrations.RunPython(restrict_direct_access, migrations.RunPython.noop)]
