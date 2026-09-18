from django.db import models
from apps.orders.models import Orders, OrderVendors
from apps.vendors.models import Vendors
from apps.accounts.models import Users

class PaymentTransactions(models.Model):
    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(Orders, models.DO_NOTHING)
    payment_gateway = models.CharField(max_length=50)
    transaction_code = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=50, default='pending')
    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'payment_transactions'
        unique_together = (('payment_gateway', 'transaction_code'),)


class PayoutBatches(models.Model):
    id = models.BigAutoField(primary_key=True)
    batch_code = models.CharField(max_length=100, unique=True)
    executed_at = models.DateTimeField(blank=True, null=True)
    total_payout_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=50, default='processing')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'payout_batches'


class PayoutTransactions(models.Model):
    id = models.BigAutoField(primary_key=True)
    payout_batch = models.ForeignKey(PayoutBatches, models.DO_NOTHING)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    bank_name = models.CharField(max_length=255)
    bank_account_number = models.CharField(max_length=100)
    bank_account_holder = models.CharField(max_length=255)
    bank_reference_code = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, default='processing')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'payout_transactions'


class LedgerEntries(models.Model):
    id = models.BigAutoField(primary_key=True)
    order_vendor = models.OneToOneField(OrderVendors, models.DO_NOTHING)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2)
    conservation_fund = models.DecimalField(max_digits=12, decimal_places=2)
    vendor_net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_status = models.CharField(max_length=50, default='recorded')
    payout_transaction = models.ForeignKey(PayoutTransactions, models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'ledger_entries'


class ConservationAllocations(models.Model):
    id = models.BigAutoField(primary_key=True)
    project_name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, default='reforestation')
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2)
    disbursed_at = models.DateTimeField()
    approved_by_admin = models.ForeignKey(Users, models.DO_NOTHING)
    recipient_vendor = models.ForeignKey(Vendors, models.DO_NOTHING, blank=True, null=True)
    beneficiary_name = models.CharField(max_length=255, blank=True, null=True)
    evidence_url = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'conservation_allocations'
