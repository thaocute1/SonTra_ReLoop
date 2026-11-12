import json
import uuid
from decimal import Decimal

from django.db import connection
from django.utils import timezone

from apps.payments.models import LedgerEntries, PayoutBatches, PayoutTransactions
from apps.vendors.models.vendor_models import Vendors


def _vendor_bank_details(vendor_id):
    """Read optional vendor profile_data without assuming the column exists."""
    try:
        with connection.cursor() as cursor:
            columns = {
                column.name
                for column in connection.introspection.get_table_description(
                    cursor, Vendors._meta.db_table
                )
            }
            if 'profile_data' not in columns:
                return {}

            table_name = connection.ops.quote_name(Vendors._meta.db_table)
            cursor.execute(
                f'SELECT profile_data FROM {table_name} WHERE id = %s',
                [vendor_id],
            )
            row = cursor.fetchone()
    except Exception:
        return {}

    if not row or not row[0]:
        return {}
    profile = row[0]
    if isinstance(profile, str):
        try:
            profile = json.loads(profile)
        except (TypeError, ValueError):
            return {}
    if not isinstance(profile, dict):
        return {}
    return {
        'bank_name': str(profile.get('bank_name') or '').strip(),
        'bank_account_number': str(profile.get('bank_account_number') or '').strip(),
        'bank_account_holder': str(profile.get('bank_account_holder') or '').strip(),
    }


def _pending_vendor_groups():
    groups = {}
    totals = dict(gross_amount=0, platform_fee=0, conservation_fund=0, vendor_net_amount=0)
    entries = LedgerEntries.objects.filter(
        payout_status='recorded',
        order_vendor__order__payment_status='paid',
    ).exclude(
        order_vendor__status='cancelled',
    ).select_related(
        'order_vendor__vendor', 'order_vendor__order',
    ).order_by('created_at', 'id')

    for entry in entries:
        vendor_order = entry.order_vendor
        vendor = vendor_order.vendor
        row = groups.setdefault(vendor.id, {
            'vendor_id': vendor.id,
            'vendor_name': vendor.brand_name,
            'unpaid_orders_count': 0,
            'gross_amount': 0,
            'platform_fee': 0,
            'conservation_fund': 0,
            'vendor_net_amount': 0,
            'orders': [],
        })
        row['unpaid_orders_count'] += 1
        detail = {
            'id': entry.id,
            'order_code': vendor_order.order.order_code,
            'status': vendor_order.status,
            'recorded_at': entry.created_at.isoformat(),
        }
        for field in totals:
            amount = int(getattr(entry, field))
            row[field] += amount
            totals[field] += amount
            detail[field] = amount
        row['orders'].append(detail)

    for vendor_id, row in groups.items():
        row.update(_vendor_bank_details(vendor_id))
        row['vendor_net_amount_formatted'] = f"{row['vendor_net_amount']:,} VNĐ".replace(',', '.')
        row['bank_details_complete'] = all(row.get(key) for key in (
            'bank_name', 'bank_account_number', 'bank_account_holder',
        ))
        row['missing_bank_fields'] = [label for key, label in (
            ('bank_name', 'Tên ngân hàng'),
            ('bank_account_number', 'Số tài khoản'),
            ('bank_account_holder', 'Tên chủ tài khoản'),
        ) if not row.get(key)]

    return groups, totals


def payout_overview():
    groups, totals = _pending_vendor_groups()
    transactions = {}
    for tx in PayoutTransactions.objects.select_related('vendor').order_by('-id'):
        transactions.setdefault(tx.payout_batch_id, []).append({
            'id': tx.id,
            'vendor_name': tx.vendor.brand_name,
            'amount': int(tx.amount),
            'status': tx.status,
            'bank_name': tx.bank_name,
            'bank_account_number': ('••••' + tx.bank_account_number[-4:]) if tx.bank_account_number else '',
            'reference': tx.bank_reference_code,
        })

    labels = {
        'completed': 'Đã ghi nhận hoàn tất',
        'processing': 'Đang xử lý',
        'failed': 'Thất bại',
    }
    history = [{
        'id': batch.id,
        'batch_code': batch.batch_code,
        'created_at': batch.created_at.isoformat(),
        'executed_at': batch.executed_at.isoformat() if batch.executed_at else None,
        'total_amount': int(batch.total_payout_amount),
        'status': batch.status,
        'status_label': labels.get(batch.status, batch.status),
        'transactions': transactions.get(batch.id, []),
    } for batch in PayoutBatches.objects.order_by('-created_at', '-id')]

    pending = sorted(groups.values(), key=lambda row: row['vendor_net_amount'], reverse=True)
    pending_total = sum(row['vendor_net_amount'] for row in pending)
    eligible = [row for row in pending if row['bank_details_complete']]
    skipped = [row for row in pending if not row['bank_details_complete']]
    return {
        'summary': totals,
        'total_pending_payout': pending_total,
        'total_pending_payout_formatted': f"{pending_total:,} VNĐ".replace(',', '.'),
        'pending_vendors_count': len(pending),
        'pending_payouts': pending,
        'eligible_vendors_count': len(eligible),
        'skipped_vendors': skipped,
        'batches_history': history,
        'capabilities': {
            'execute': True,
            'simulated': True,
            'reason': 'Chế độ mô phỏng chỉ tạo bảng kê; không gọi PayOS và không cập nhật trạng thái đã chi.',
        },
        'generated_at': timezone.now().isoformat(),
    }


def simulate_payout_batch():
    groups, _ = _pending_vendor_groups()
    pending = sorted(groups.values(), key=lambda row: row['vendor_net_amount'], reverse=True)
    payouts = []
    skipped = []

    for row in pending:
        if not row['bank_details_complete']:
            skipped.append({
                'vendor_id': row['vendor_id'],
                'vendor_name': row['vendor_name'],
                'vendor_net_amount': row['vendor_net_amount'],
                'missing_bank_fields': row['missing_bank_fields'],
            })
            continue
        payouts.append({
            'vendor_id': row['vendor_id'],
            'vendor_name': row['vendor_name'],
            'bank_name': row['bank_name'],
            'bank_account_number': row['bank_account_number'],
            'bank_account_holder': row['bank_account_holder'],
            'amount': row['vendor_net_amount'],
            'order_count': row['unpaid_orders_count'],
        })

    total_amount = sum(row['amount'] for row in payouts)
    return {
        'success': True,
        'simulated': True,
        'message': 'Đã tạo bảng kê mô phỏng. Chưa có khoản tiền nào được chuyển.',
        'batch_reference': f"SIM-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:8].upper()}",
        'generated_at': timezone.now().isoformat(),
        'total_amount': total_amount,
        'vendor_count': len(payouts),
        'skipped_vendor_count': len(skipped),
        'payouts': payouts,
        'skipped_vendors': skipped,
    }
