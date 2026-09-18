from django.db import models
from apps.accounts.models import Users
from apps.vendors.models import Vendors, Guides
from apps.tours.models import Tours, Products

class Orders(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(Users, models.DO_NOTHING)
    order_code = models.CharField(max_length=100, unique=True)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(max_length=50, default='pending')
    expires_at = models.DateTimeField(blank=True, null=True)
    shipping_address = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'orders'

    def __str__(self):
        return self.order_code


class OrderVendors(models.Model):
    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(Orders, models.DO_NOTHING)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    guide = models.ForeignKey(Guides, models.DO_NOTHING, blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=50, default='waiting_payment')
    refund_status = models.CharField(max_length=50, default='none')
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cancellation_reason = models.TextField(blank=True, null=True)
    refund_reason = models.TextField(blank=True, null=True)
    refund_requested_at = models.DateTimeField(blank=True, null=True)
    refunded_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'order_vendors'


class OrderItems(models.Model):
    id = models.BigAutoField(primary_key=True)
    order_vendor = models.ForeignKey(OrderVendors, models.DO_NOTHING)
    item_type = models.CharField(max_length=50)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    campaign_item = models.ForeignKey('flash_sales.CampaignItems', models.DO_NOTHING, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    price_at_sale_time = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'order_items'


class Vouchers(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    code = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    discount_percent = models.IntegerField(blank=True, null=True)
    points_required = models.IntegerField(default=0)
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vouchers'


class UserVouchers(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING)
    voucher = models.ForeignKey(Vouchers, models.DO_NOTHING)
    gifted_by_user = models.ForeignKey(Users, models.DO_NOTHING, related_name='gifted_user_vouchers', blank=True, null=True)
    status = models.CharField(max_length=50, default='unused')
    acquired_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_vouchers'
