from django.utils import timezone
from apps.payments.models import LedgerEntries, PayoutBatches, PayoutTransactions


def payout_overview():
    groups = {}
    totals = dict(gross_amount=0, platform_fee=0, conservation_fund=0, vendor_net_amount=0)
    entries = LedgerEntries.objects.filter(payout_status='recorded', order_vendor__order__payment_status='paid').exclude(order_vendor__status='cancelled').select_related('order_vendor__vendor', 'order_vendor__order').order_by('created_at', 'id')
    for entry in entries:
        vendor_order = entry.order_vendor
        vendor = vendor_order.vendor
        row = groups.setdefault(vendor.id, dict(vendor_id=vendor.id, vendor_name=vendor.brand_name, unpaid_orders_count=0, gross_amount=0, platform_fee=0, conservation_fund=0, vendor_net_amount=0, orders=[]))
        row['unpaid_orders_count'] += 1
        detail = dict(id=entry.id, order_code=vendor_order.order.order_code, status=vendor_order.status, recorded_at=entry.created_at.isoformat())
        for field in totals:
            amount = int(getattr(entry, field))
            row[field] += amount
            totals[field] += amount
            detail[field] = amount
        row['orders'].append(detail)
    transactions = {}
    for tx in PayoutTransactions.objects.select_related('vendor').order_by('-id'):
        transactions.setdefault(tx.payout_batch_id, []).append(dict(id=tx.id, vendor_name=tx.vendor.brand_name, amount=int(tx.amount), status=tx.status, bank_name=tx.bank_name, bank_account_number=('••••' + tx.bank_account_number[-4:]) if tx.bank_account_number else '', reference=tx.bank_reference_code))
    labels = {'completed': 'Đã ghi nhận hoàn tất', 'processing': 'Đang xử lý', 'failed': 'Thất bại', 'cancelled': 'Đã hủy'}
    history = [dict(id=batch.id, batch_code=batch.batch_code, created_at=batch.created_at.isoformat(), executed_at=batch.executed_at.isoformat() if batch.executed_at else None, total_amount=int(batch.total_payout_amount), status=batch.status, status_label=labels.get(batch.status, batch.status), transactions=transactions.get(batch.id, [])) for batch in PayoutBatches.objects.order_by('-created_at', '-id')]
    return dict(summary=totals, total_pending_payout=totals['vendor_net_amount'], pending_vendors_count=len(groups), pending_payouts=sorted(groups.values(), key=lambda row: row['vendor_net_amount'], reverse=True), batches_history=history, capabilities={'execute': False, 'reason': 'Chưa kết nối dịch vụ giải ngân ngân hàng. Hiện có thể đối soát và xuất dữ liệu; chưa thể phát lệnh chuyển tiền.'}, generated_at=timezone.now().isoformat())
