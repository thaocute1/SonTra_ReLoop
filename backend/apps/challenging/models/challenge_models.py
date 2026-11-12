from django.db import models
from apps.tours.models import Tours, Checkpoints
from apps.vendors.models import Vendors, Guides
from apps.accounts.models import Users
from apps.orders.models import OrderVendors

class Challenges(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, blank=True, null=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    banner_url = models.TextField(blank=True, null=True)
    time_limit_minutes = models.IntegerField(blank=True, null=True)
    badge_name = models.CharField(max_length=255)
    badge_icon_url = models.TextField()
    badge_description = models.TextField(blank=True, null=True)
    reward_points = models.IntegerField(default=100)
    is_active = models.BooleanField(default=True)
    
    # Các trường mở rộng theo phân hệ Nhiệm vụ xanh
    mission_type = models.CharField(max_length=50, default='checkin_gps')  # checkin_gps, eco_action
    scope = models.CharField(max_length=50, default='tour')  # tour, open
    is_required = models.BooleanField(default=False)
    eco_activity_type = models.CharField(max_length=50, blank=True, null=True)  # trash_pickup, tree_planting, other
    target_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    group_bonus_points = models.IntegerField(default=0)
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_to = models.DateTimeField(blank=True, null=True)
    approval_status = models.CharField(max_length=50, default='pending_approval')  # draft, pending_approval, approved, rejected
    rejection_reason = models.TextField(blank=True, null=True)
    approved_by_admin = models.ForeignKey(Users, models.DO_NOTHING, blank=True, null=True, related_name='approved_challenges')
    approved_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'challenges'

    def __str__(self):
        return f"{self.title} ({self.mission_type})"


class ChallengeCheckpoints(models.Model):
    pk = models.CompositePrimaryKey('challenge_id', 'checkpoint_id')
    challenge = models.ForeignKey(Challenges, models.DO_NOTHING)
    checkpoint = models.ForeignKey(Checkpoints, models.DO_NOTHING)
    order_index = models.IntegerField()
    is_required = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'challenge_checkpoints'
        unique_together = (('challenge', 'checkpoint'), ('challenge', 'order_index'),)


class ChallengeAttempts(models.Model):
    id = models.BigAutoField(primary_key=True)
    challenge = models.ForeignKey(Challenges, models.DO_NOTHING)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    order_vendor = models.ForeignKey(OrderVendors, models.DO_NOTHING, blank=True, null=True)
    group_code = models.CharField(max_length=100, blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)  # Cho phép NULL khi mới tự gán chưa bắt đầu
    assigned_at = models.DateTimeField(auto_now_add=True)
    assignment_source = models.CharField(max_length=50, default='self_join')  # auto_booking, self_join
    completed_at = models.DateTimeField(blank=True, null=True)
    last_active_at = models.DateTimeField(blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=50, default='in_progress')  # in_progress, completed, failed, expired
    total_time_seconds = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'challenge_attempts'


class CheckinLogs(models.Model):
    id = models.BigAutoField(primary_key=True)
    challenge_attempt = models.ForeignKey(ChallengeAttempts, models.DO_NOTHING)
    checkpoint = models.ForeignKey(Checkpoints, models.DO_NOTHING)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    gps_accuracy_m = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    distance_from_checkpoint_m = models.DecimalField(max_digits=8, decimal_places=2)
    is_mock_location = models.BooleanField(default=False)
    dwell_seconds = models.IntegerField(blank=True, null=True)
    calculated_speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    is_flagged_for_manual_review = models.BooleanField(default=False)
    photo_url = models.TextField(blank=True, null=True)
    photo_exif_lat = models.DecimalField(max_digits=10, decimal_places=8, blank=True, null=True)
    photo_exif_lng = models.DecimalField(max_digits=11, decimal_places=8, blank=True, null=True)
    verified_by_guide = models.ForeignKey(Guides, models.DO_NOTHING, blank=True, null=True)
    manual_verified_at = models.DateTimeField(blank=True, null=True)
    
    # Phương thức xác thực & quy trình duyệt rõ ràng
    method = models.CharField(max_length=50, default='gps')  # gps, qr, photo, guide
    qr_payload = models.TextField(blank=True, null=True)
    review_status = models.CharField(max_length=50, default='auto_approved')  # auto_approved, pending_review, approved, rejected
    reviewed_by_user = models.ForeignKey(Users, models.DO_NOTHING, blank=True, null=True, related_name='reviewed_checkin_logs')
    
    is_valid = models.BooleanField(default=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'checkin_logs'
