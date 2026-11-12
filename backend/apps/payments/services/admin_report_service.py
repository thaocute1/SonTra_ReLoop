from datetime import datetime, time, timedelta
from decimal import Decimal
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from apps.payments.models import LedgerEntries
from apps.orders.models.order_models import OrderItems


def revenue_report(period, start_date=None, end_date=None):
    now = timezone.localtime()
    if start_date or end_date:
        start_day = parse_date(start_date or '')
        end_day = parse_date(end_date or '')
        if not start_day or not end_day:
            raise ValidationError({'date_range': 'Chọn đầy đủ ngày bắt đầu và ngày kết thúc theo định dạng YYYY-MM-DD.'})
        if start_day > end_day:
            raise ValidationError({'date_range': 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'})
        if (end_day - start_day).days > 366:
            raise ValidationError({'date_range': 'Khoảng thời gian tối đa là 366 ngày.'})
        start = timezone.make_aware(datetime.combine(start_day, time.min))
        end = timezone.make_aware(datetime.combine(end_day, time.max))
        period = 'custom'
    else:
        if period not in ('month', 'quarter', 'year'):
            raise ValidationError({'period': 'Chọn month, quarter hoặc year.'})
        month = 1 if period == 'year' else ((now.month - 1) // 3 * 3 + 1 if period == 'quarter' else now.month)
        start = timezone.make_aware(datetime(now.year, month, 1))
        end = now
    entries = list(LedgerEntries.objects.filter(
        created_at__gte=start, created_at__lte=end,
        order_vendor__order__payment_status='paid',
    ).exclude(order_vendor__status='cancelled').select_related('order_vendor__vendor'))
    fields = {'gross_total': 'gross_amount', 'net_vendor': 'vendor_net_amount', 'bql_fund': 'conservation_fund', 'platform_fee': 'platform_fee'}
    result = {'period': period}
    for key, field in fields.items():
        result[key] = int(sum((getattr(entry, field) for entry in entries), Decimal('0')))
        result[key + '_formatted'] = f"{result[key]:,} VNĐ".replace(',', '.')
    months = {}
    cursor = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    final_month = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    while cursor <= final_month:
        months[(cursor.year, cursor.month)] = {'label': f'Tháng {cursor.month}/{cursor.year}', 'revenue': 0, 'bookings': 0}
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    items_by_vendor_order = {}
    for item in OrderItems.objects.filter(order_vendor_id__in=[entry.order_vendor_id for entry in entries]).select_related('tour'):
        items_by_vendor_order.setdefault(item.order_vendor_id, []).append(item)
    tours = {}
    for entry in entries:
        entry_date = timezone.localtime(entry.created_at)
        point = months[(entry_date.year, entry_date.month)]
        point['revenue'] += int(entry.gross_amount)
        point['bookings'] += 1
        items = items_by_vendor_order.get(entry.order_vendor_id, [])
        weight = sum((item.price_at_sale_time for item in items), Decimal('0'))
        remainder = int(entry.gross_amount)
        seen = set()
        for index, item in enumerate(items):
            key = item.tour_id
            row = tours.setdefault(key, {'tour_name': item.tour.title if item.tour else 'Sản phẩm khác', 'bookings_count': 0, 'revenue': 0})
            amount = remainder if index == len(items) - 1 else int(entry.gross_amount * item.price_at_sale_time / weight) if weight else 0
            remainder -= amount
            row['revenue'] += amount
            if key not in seen:
                row['bookings_count'] += 1
                seen.add(key)
    for row in tours.values():
        row['pct'] = round(row['revenue'] * 100 / result['gross_total'], 1) if result['gross_total'] else 0
    result['timeline_chart'] = list(months.values())
    result['tours_breakdown'] = sorted(tours.values(), key=lambda row: row['revenue'], reverse=True)
    order_ids = {entry.order_vendor.order_id for entry in entries}
    previous_start = start - (end - start)
    previous = LedgerEntries.objects.filter(created_at__gte=previous_start, created_at__lt=start, order_vendor__order__payment_status='paid').exclude(order_vendor__status='cancelled')
    previous_gross = sum((entry.gross_amount for entry in previous), Decimal('0'))
    vendors = {}
    for entry in entries:
        vendor = entry.order_vendor.vendor
        row = vendors.setdefault(vendor.id, {'id': vendor.id, 'name': vendor.brand_name, 'revenue': 0, 'net': 0, 'orders': 0})
        row['revenue'] += int(entry.gross_amount)
        row['net'] += int(entry.vendor_net_amount)
        row['orders'] += 1
    result['business'] = {
        'paid_orders': len(order_ids),
        'average_order_value': round(result['gross_total'] / len(order_ids)) if order_ids else 0,
        'previous_revenue': int(previous_gross),
        'revenue_change_pct': round((Decimal(result['gross_total']) - previous_gross) * 100 / previous_gross, 1) if previous_gross else None,
        'active_vendors': len(vendors),
    }
    result['vendors'] = sorted(vendors.values(), key=lambda row: row['revenue'], reverse=True)
    result['range'] = {'start': start.isoformat(), 'end': end.isoformat(), 'comparison_start': previous_start.isoformat(), 'comparison_end': start.isoformat()}
    result['generated_at'] = now.isoformat()
    result['summary'] = {'total_bookings': len(order_ids), 'completion_rate': None}
    for target, source in [('gross_revenue', 'gross_total'), ('vendor_net_amount', 'net_vendor'), ('conservation_fund', 'bql_fund'), ('platform_fee', 'platform_fee')]:
        result['summary'][target] = result[source]
        result['summary'][target + '_formatted'] = result[source + '_formatted']
    return result
