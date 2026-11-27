from django.db import migrations, models


def enable_row_security(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('ALTER TABLE schedule_chat_messages ENABLE ROW LEVEL SECURITY')


class Migration(migrations.Migration):
    dependencies = [('tours', '0001_trip_field_events')]
    operations = [
        migrations.CreateModel(
            name='ScheduleChatMessage',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('schedule_id', models.BigIntegerField()),
                ('sender_id', models.BigIntegerField()),
                ('content', models.CharField(max_length=2000)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'schedule_chat_messages',
                'indexes': [models.Index(fields=['schedule_id', 'id'], name='schedule_chat_history_idx')],
            },
        ),
        migrations.RunPython(enable_row_security, migrations.RunPython.noop),
    ]
