from django.db import models
from apps.accounts.models import Users

class Vendors(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(Users, models.DO_NOTHING)
    vendor_type = models.CharField(max_length=50, default='tour_operator')
    brand_name = models.CharField(max_length=255)
    logo_url = models.TextField(blank=True, null=True)
    business_license_code = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.1000)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='pending_approval')
    rejection_reason = models.TextField(blank=True, null=True)
    verified_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='verified_vendors', blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vendors'

    def __str__(self):
        return self.brand_name


class Guides(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    user = models.OneToOneField(Users, models.DO_NOTHING)
    license_number = models.CharField(max_length=100, blank=True, null=True)
    languages = models.JSONField(default=list)
    experience_years = models.IntegerField(default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'guides'

    def __str__(self):
        return f"Guide {self.user.name} ({self.vendor.brand_name})"
