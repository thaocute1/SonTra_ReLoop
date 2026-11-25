from decimal import Decimal, InvalidOperation


class FlashSalePriceChangedError(ValueError):
    """Raised when the locked Flash Sale price differs from the client's expected price."""

    def __init__(self, message, payload=None):
        super().__init__(message)
        self.code = 'FLASH_SALE_PRICE_CHANGED'
        self.payload = payload or {}


def normalize_price_tiers(raw_tiers, tour_price):
    """
    Validate and normalize a vendor-submitted list of tiered prices.
    Returns (normalized_tiers, starting_promo_price_decimal, total_slot_quantity).
    """
    if not isinstance(raw_tiers, list) or len(raw_tiers) == 0:
        raise ValueError('Danh sách bậc giá không hợp lệ.')
    if len(raw_tiers) > 5:
        raise ValueError('Chỉ hỗ trợ tối đa 5 bậc giá cho mỗi tour.')

    tour_price_dec = Decimal(str(tour_price))
    normalized = []
    total_qty = 0
    prev_price = None

    for idx, tier in enumerate(raw_tiers, start=1):
        if not isinstance(tier, dict):
            raise ValueError(f'Dữ liệu bậc giá thứ {idx} không hợp lệ.')
        try:
            qty = int(tier.get('quantity'))
            price = Decimal(str(tier.get('price')))
        except (InvalidOperation, TypeError, ValueError):
            raise ValueError(f'Số suất hoặc giá của bậc {idx} không hợp lệ.')

        if qty < 1:
            raise ValueError(f'Số suất của bậc {idx} phải lớn hơn 0.')
        if price <= 0 or price >= tour_price_dec:
            raise ValueError(f'Giá của bậc {idx} phải lớn hơn 0 và thấp hơn giá niêm yết.')
        if prev_price is not None and price <= prev_price:
            raise ValueError(f'Giá của bậc {idx} phải cao hơn giá bậc trước đó.')

        label = str(tier.get('label') or '').strip() or f'Bậc {idx}'
        normalized.append({
            'tier_index': idx,
            'label': label,
            'quantity': qty,
            'price': int(price) if price == int(price) else float(price),
        })
        total_qty += qty
        prev_price = price

    if total_qty > 1000:
        raise ValueError('Tổng số suất các bậc giá không được vượt quá 1000.')

    first_price = Decimal(str(normalized[0]['price']))
    return normalized, first_price, total_qty


def compute_tier_state(item):
    """
    Compute live per-tier sold/remaining slots and current/next tier dynamically from item.sold_quantity.
    Works for both multi-tier items (price_tiers JSON) and legacy single-price items.
    """
    raw_tiers = getattr(item, 'price_tiers', None)
    slot_quantity = max(0, int(getattr(item, 'slot_quantity', 0) or 0))
    sold_quantity = max(0, int(getattr(item, 'sold_quantity', 0) or 0))
    fallback_price = Decimal(str(getattr(item, 'promo_price', 0) or 0))

    has_multi_tiers = isinstance(raw_tiers, list) and len(raw_tiers) > 0
    if has_multi_tiers:
        source_tiers = raw_tiers
    else:
        source_tiers = [{
            'tier_index': 1,
            'label': 'Giá Flash Sale',
            'quantity': slot_quantity,
            'price': int(fallback_price) if fallback_price == int(fallback_price) else float(fallback_price),
        }]

    enriched = []
    remaining_sold = sold_quantity
    for idx, tier in enumerate(source_tiers, start=1):
        qty = max(0, int(tier.get('quantity', 0)))
        price_val = Decimal(str(tier.get('price', fallback_price)))
        sold_in_tier = min(qty, remaining_sold)
        remaining_in_tier = max(0, qty - sold_in_tier)
        remaining_sold = max(0, remaining_sold - sold_in_tier)
        enriched.append({
            'tier_index': int(tier.get('tier_index', idx)),
            'label': str(tier.get('label') or f'Bậc {idx}'),
            'quantity': qty,
            'price': int(price_val) if price_val == int(price_val) else float(price_val),
            'sold_in_tier': sold_in_tier,
            'remaining_in_tier': remaining_in_tier,
        })

    current_idx = None
    for idx, tier in enumerate(enriched):
        if tier['remaining_in_tier'] > 0:
            current_idx = idx
            break

    if current_idx is not None:
        current_tier = enriched[current_idx]
        next_tier = enriched[current_idx + 1] if current_idx + 1 < len(enriched) else None
    else:
        current_tier = enriched[-1] if enriched else None
        next_tier = None

    return {
        'has_price_tiers': has_multi_tiers and len(enriched) > 1,
        'tiers': enriched,
        'current_tier': current_tier,
        'next_tier': next_tier,
    }


def calculate_tiered_quote(item, adults_count, children_count=0):
    """
    Calculate cumulative split-tier pricing for (adults_count, children_count) starting from item.sold_quantity.
    Adults are allocated first at 100% of tier price, children next at 70% of tier price.
    """
    adults = int(adults_count)
    children = int(children_count)
    total_guests = adults + children
    if adults < 1 or children < 0 or total_guests < 1:
        raise ValueError('Số lượng khách đặt tour không hợp lệ.')

    state = compute_tier_state(item)
    tiers = state['tiers']
    total_remaining = sum(t['remaining_in_tier'] for t in tiers)
    if total_remaining < total_guests:
        raise ValueError(
            f"Suất ưu đãi Flash Sale chỉ còn lại {max(0, total_remaining)} vé, "
            f"không đủ cho đoàn {total_guests} khách!"
        )

    adults_left = adults
    children_left = children
    breakdown = []
    grand_total = 0

    for tier in tiers:
        avail = tier['remaining_in_tier']
        if avail <= 0 or (adults_left == 0 and children_left == 0):
            continue

        adults_here = min(avail, adults_left)
        avail -= adults_here
        adults_left -= adults_here

        children_here = min(avail, children_left)
        avail -= children_here
        children_left -= children_here

        qty_here = adults_here + children_here
        if qty_here > 0:
            tier_price = int(Decimal(str(tier['price'])))
            subtotal = adults_here * tier_price + int(children_here * tier_price * 0.7)
            grand_total += subtotal
            breakdown.append({
                'tier_index': tier['tier_index'],
                'label': tier['label'],
                'quantity': qty_here,
                'adults_count': adults_here,
                'children_count': children_here,
                'unit_price': tier_price,
                'subtotal': subtotal,
            })

    effective_unit_price = (
        breakdown[0]['unit_price']
        if len(breakdown) == 1 and children == 0
        else round(grand_total / total_guests)
    )

    return {
        'grand_total': int(grand_total),
        'effective_unit_price': int(effective_unit_price),
        'breakdown': breakdown,
        'crossed_tiers': len(breakdown) > 1,
        'current_tier': state['current_tier'],
        'next_tier': state['next_tier'],
        'sold_quantity': int(getattr(item, 'sold_quantity', 0) or 0),
        'remaining_slots': int(total_remaining),
    }
