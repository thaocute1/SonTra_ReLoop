from django.db import models
from apps.accounts.models import Users

class Posts(models.Model):
    id = models.BigAutoField(primary_key=True)
    author = models.ForeignKey(Users, models.DO_NOTHING)
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    post_type = models.CharField(max_length=50, default='article')
    content = models.TextField(blank=True, null=True)
    thumbnail_url = models.TextField(blank=True, null=True)
    link_url = models.TextField(blank=True, null=True)
    collected_kg = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    event_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=50, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'posts'


class ChatHistories(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, blank=True, null=True)
    session_id = models.CharField(max_length=100)
    user_message = models.TextField()
    bot_response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'chat_histories'


class ChatFeedbacks(models.Model):
    id = models.BigAutoField(primary_key=True)
    chat_history = models.ForeignKey(ChatHistories, models.DO_NOTHING)
    is_helpful = models.BooleanField()
    feedback_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'chat_feedbacks'


class NotificationUserState(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(db_index=True)
    notification_key = models.CharField(max_length=120)
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_user_states'
        constraints = [
            models.UniqueConstraint(fields=['user_id', 'notification_key'], name='uniq_user_notif_key'),
        ]
