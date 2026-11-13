import uuid

from django.db import models


class TripFieldEvent(models.Model):
    """Schedule-scoped field operations. IDs reference the existing external schema."""

    id = models.BigAutoField(primary_key=True)
    schedule_id = models.BigIntegerField(db_index=True)
    user_id = models.BigIntegerField()
    participant_id = models.BigIntegerField(null=True, blank=True)
    request_id = models.UUIDField(default=uuid.uuid4, unique=True)
    kind = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='received')
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trip_field_events'
        ordering = ['created_at', 'id']
