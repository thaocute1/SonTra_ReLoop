from django.db import models


class ScheduleChatMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    schedule_id = models.BigIntegerField()
    sender_id = models.BigIntegerField()
    content = models.CharField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'schedule_chat_messages'
        indexes = [models.Index(fields=['schedule_id', 'id'], name='schedule_chat_history_idx')]
