from django.db import models
from apps.accounts.models.user_models import Users

class Notifications(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, related_name='notifications')
    notification_type = models.CharField(max_length=50)  # mission_assigned, mission_suggested, checkin_review_result, points_awarded, reward_redeemed, system
    title = models.CharField(max_length=255)
    body = models.TextField()
    challenge = models.ForeignKey('challenging.Challenges', models.DO_NOTHING, blank=True, null=True)
    challenge_attempt = models.ForeignKey('challenging.ChallengeAttempts', models.DO_NOTHING, blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.user.name} - {self.title}"
