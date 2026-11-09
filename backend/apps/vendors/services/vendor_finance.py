from datetime import datetime, time, timedelta

from django.db.models import Q, Sum
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone

from apps.payments.models import LedgerEntries, PayoutTransactions


REVENUE_PERIODS = {
    '7d': '7 ngày',
    '30d': '30 ngày',
    '3m': '3 tháng',
    '12m': '12 tháng',
}
DEFAULT_REVENUE_PERIOD = '3m'
MONEY_FIELDS = ('gross_amount', 'platform_fee', 'conservation_fund', 'vendor_net_amount')
HISTORY_LIMIT = 20


def shift_month(day, offset):
    year, month = divmod(day.year * 12 + day.month - 1 + offset, 12)
    return day.replace(year=year, month=month + 1, day=1)


def at_midnight(day):
    return timezone.make_aware(datetime.combine(day, time.min))


def vendor_finance(vendor_id, period):
    now = timezone.localtime()
    today = now.date()
    month_start = at_midnight(today.replace(day=1))
    previous_month_start = at_midnight(shift_month(today, -1))
    entries = LedgerEntries.objects.filter(
        order_vendor__vendor_id=vendor_id,
        order_vendor__order__payment_status='paid',
        created_at__lte=now,
    ).exclude(order_vendor__status='cancelled').exclude(order_vendor__refund_status='refunded')

    totals = entries.aggregate(
        monthly_revenue=Sum('gross_amount', filter=Q(created_at__gte=month_start), default=0),
        previous_month_revenue=Sum(
            'gross_amount',
            filter=Q(created_at__gte=previous_month_start, created_at__lt=month_start),
            default=0,
        ),
        pending_amount=Sum(
            'vendor_net_amount',
            filter=Q(payout_status__in=['recorded', 'reconciled', 'pending_payout']),
            default=0,
        ),
        on_hold_amount=Sum('vendor_net_amount', filter=Q(payout_status='on_hold'), default=0),
        paid_amount=Sum('vendor_net_amount', filter=Q(payout_status='paid'), default=0),
        **{f'total_{field}': Sum(field, default=0) for field in MONEY_FIELDS},
    )

    if period in ('7d', '30d'):
        days = int(period[:-1])
        start = today - timedelta(days=days - 1)
        dates = [start + timedelta(days=index) for index in range(days)]
        bucket = TruncDay('created_at')
        label_format = '%d/%m'
    else:
        months = int(period[:-1])
        dates = [shift_month(today, offset) for offset in range(1 - months, 1)]
        bucket = TruncMonth('created_at')
        label_format = '%m/%Y'

    grouped = entries.filter(created_at__gte=at_midnight(dates[0])).annotate(
        bucket=bucket,
    ).values('bucket').annotate(revenue=Sum('gross_amount'))
    amounts_by_date = {row['bucket'].date(): row['revenue'] for row in grouped}
    chart = {
        'period': period,
        'active_period': REVENUE_PERIODS[period],
        'data': [
            {
                'date': day.isoformat(),
                'month': day.strftime(label_format),
                'label': day.strftime(label_format),
                'revenue': amounts_by_date.get(day, 0),
            }
            for day in dates
        ],
    }

    rows = entries.values(
        'id', 'order_vendor__order__order_code', 'created_at', 'payout_status', *MONEY_FIELDS,
    ).order_by('-created_at', '-id')[:HISTORY_LIMIT]
    payouts = PayoutTransactions.objects.filter(vendor_id=vendor_id).values(
        'id', 'payout_batch__batch_code', 'payout_batch__executed_at',
        'amount', 'status', 'bank_reference_code', 'created_at',
    ).order_by('-created_at', '-id')[:HISTORY_LIMIT]

    reconciliation = {
        'summary': {
            **{field: str(totals[f'total_{field}']) for field in MONEY_FIELDS},
            **{field: str(totals[field]) for field in ('pending_amount', 'on_hold_amount', 'paid_amount')},
        },
        'entries': [
            {
                'id': row['id'],
                'order_code': row['order_vendor__order__order_code'],
                'recorded_at': row['created_at'],
                'status': row['payout_status'],
                **{field: str(row[field]) for field in MONEY_FIELDS},
            }
            for row in rows
        ],
        'payouts': [
            {
                'id': payout['id'],
                'batch_code': payout['payout_batch__batch_code'],
                'created_at': payout['created_at'],
                'executed_at': payout['payout_batch__executed_at'],
                'amount': str(payout['amount']),
                'status': payout['status'],
                'reference': payout['bank_reference_code'],
            }
            for payout in payouts
        ],
        'history_limit': HISTORY_LIMIT,
    }
    return totals, chart, reconciliation
