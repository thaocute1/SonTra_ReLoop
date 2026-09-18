from django.db import models
from apps.accounts.models import Users
from apps.vendors.models import Vendors, Guides
from apps.tours.models import Tours, Products
from apps.orders.models import OrderVendors, UserVouchers
from apps.challenging.models import ChallengeAttempts, Challenges

class Certificates(models.Model):
    id = models.BigAutoField(primary_key=True)
    challenge_attempt = models.OneToOneField(ChallengeAttempts, models.DO_NOTHING)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    certificate_code = models.CharField(max_length=100, unique=True)
    pdf_url = models.TextField()
    qr_code_url = models.TextField()
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'certificates'


class Badges(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    challenge = models.ForeignKey(Challenges, models.DO_NOTHING)
    badge_name = models.CharField(max_length=255)
    badge_icon_url = models.TextField()
    badge_description = models.TextField(blank=True, null=True)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'badges'
        unique_together = (('customer', 'challenge'),)


class Reviews(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    order_vendor = models.ForeignKey(OrderVendors, models.DO_NOTHING)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    guide = models.ForeignKey(Guides, models.DO_NOTHING, blank=True, null=True)
    rating = models.IntegerField()
    comment = models.TextField(blank=True, null=True)
    images = models.JSONField(default=list)
    status = models.CharField(max_length=50, default='pending_approval')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'reviews'
        unique_together = (('order_vendor', 'tour'), ('order_vendor', 'product'),)


class Feedbacks(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    order_vendor = models.ForeignKey(OrderVendors, models.DO_NOTHING, blank=True, null=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, blank=True, null=True)
    feedback_type = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50, default='vendor')
    title = models.CharField(max_length=255)
    content = models.TextField()
    images = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=50, default='pending')
    handled_by_staff = models.ForeignKey(Users, models.DO_NOTHING, related_name='handled_feedbacks', blank=True, null=True)
    resolution_notes = models.TextField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'feedbacks'


class EcoTrashSubmissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(Users, models.DO_NOTHING, related_name='trash_submissions')
    staff = models.ForeignKey(Users, models.DO_NOTHING, related_name='processed_trash_submissions')
    total_weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    trash_details = models.JSONField()
    evidence_photo_url = models.TextField()
    points_awarded = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'eco_trash_submissions'


class PointRateVersions(models.Model):
    id = models.BigAutoField(primary_key=True)
    rate_type = models.CharField(max_length=100)
    points_per_unit = models.IntegerField()
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'point_rate_versions'


class PointsLedger(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    points_change = models.IntegerField()
    reason = models.CharField(max_length=255)
    reference_type = models.CharField(max_length=100, blank=True, null=True)
    eco_trash_submission = models.ForeignKey(EcoTrashSubmissions, models.DO_NOTHING, blank=True, null=True)
    challenge_attempt = models.ForeignKey(ChallengeAttempts, models.DO_NOTHING, blank=True, null=True)
    order_vendor = models.ForeignKey(OrderVendors, models.DO_NOTHING, blank=True, null=True)
    user_voucher = models.ForeignKey(UserVouchers, models.DO_NOTHING, blank=True, null=True)
    point_rate_version = models.ForeignKey(PointRateVersions, models.DO_NOTHING, blank=True, null=True)
    rate_snapshot = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'points_ledger'
