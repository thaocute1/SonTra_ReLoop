from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name='NotificationUserState',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('user_id', models.BigIntegerField(db_index=True)),
                ('notification_key', models.CharField(max_length=120)),
                ('is_read', models.BooleanField(default=False)),
                ('is_dismissed', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'notification_user_states',
                'constraints': [
                    models.UniqueConstraint(
                        fields=['user_id', 'notification_key'],
                        name='uniq_user_notif_key',
                    ),
                ],
            },
        ),
    ]
