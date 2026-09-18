from django.db import models
from apps.vendors.models import Vendors
from apps.accounts.models import Users

class Tours(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    cover_image_url = models.TextField(blank=True, null=True)
    images = models.JSONField(default=list)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    max_capacity = models.IntegerField(default=20)
    difficulty_level = models.CharField(max_length=50, default='moderate')
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    cancellation_policy = models.JSONField(blank=True, null=True)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='draft')
    rejection_reason = models.TextField(blank=True, null=True)
    suspended_reason = models.TextField(blank=True, null=True)
    approved_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='approved_tours', blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    suspended_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='suspended_tours', blank=True, null=True)
    suspended_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tours'

    def __str__(self):
        return self.title


class Routes(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour = models.OneToOneField(Tours, models.DO_NOTHING)
    start_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    start_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    end_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    end_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    total_distance_km = models.DecimalField(max_digits=5, decimal_places=2)
    elevation_gain_m = models.IntegerField(blank=True, null=True)
    gpx_file_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'routes'


class Checkpoints(models.Model):
    id = models.BigAutoField(primary_key=True)
    route = models.ForeignKey(Routes, models.DO_NOTHING)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    radius_tolerance_m = models.IntegerField(default=30)
    min_dwell_seconds = models.IntegerField(default=0)
    order_index = models.IntegerField()
    is_mandatory = models.BooleanField(default=True)
    require_photo = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='pending')
    admin_feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'checkpoints'
        unique_together = (('route', 'order_index'),)

    def __str__(self):
        return f"{self.order_index}. {self.name}"


class Products(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    origin = models.CharField(max_length=255, blank=True, null=True)
    material = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    images = models.JSONField(default=list)
    qr_code_url = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='pending_approval')
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'products'

    def __str__(self):
        return self.name
