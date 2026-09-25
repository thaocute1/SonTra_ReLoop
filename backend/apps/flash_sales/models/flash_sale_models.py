from django.db import models
from apps.vendors.models import Vendors
from apps.tours.models import Tours, Products

class Campaigns(models.Model):
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    banner_url = models.TextField(blank=True, null=True)
    registration_deadline = models.DateTimeField()
    max_items_per_vendor = models.IntegerField(default=3)
    status = models.CharField(max_length=50, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'campaigns'


class CampaignSessions(models.Model):
    id = models.BigAutoField(primary_key=True)
    campaign = models.ForeignKey(Campaigns, models.DO_NOTHING)
    session_name = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    auto_extend_enabled = models.BooleanField(default=False)
    max_extend_minutes = models.IntegerField(default=30)
    extend_count = models.IntegerField(default=0)
    dynamic_pricing_enabled = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='upcoming')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'campaign_sessions'


class CampaignItems(models.Model):
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(CampaignSessions, models.DO_NOTHING)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    promo_price = models.DecimalField(max_digits=12, decimal_places=2)
    slot_quantity = models.IntegerField(default=10)
    sold_quantity = models.IntegerField(default=0)
    price_tiers = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=50, default='pending_approval')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'campaign_items'
