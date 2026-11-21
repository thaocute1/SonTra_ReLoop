export function computeClientTierState(item) {
  if (!item) {
    return { hasPriceTiers: false, tiers: [], currentTier: null, nextTier: null };
  }
  const rawTiers = Array.isArray(item.price_tiers) && item.price_tiers.length > 0 ? item.price_tiers : null;
  const slotQuantity = Math.max(0, Number(item.slot_quantity || item.flash_slot_quantity || 0));
  const soldQuantity = Math.max(0, Number(item.sold_quantity || item.flash_sold_quantity || 0));
  const fallbackPrice = Number(item.promo_price || item.price || 0);

  const sourceTiers = rawTiers || [
    {
      tier_index: 1,
      label: "Giá Flash Sale",
      quantity: slotQuantity || 100,
      price: fallbackPrice,
    },
  ];

  let remainingSold = soldQuantity;
  const tiers = sourceTiers.map((tier, idx) => {
    const quantity = Math.max(0, Number(tier.quantity || 0));
    const price = Number(tier.price || fallbackPrice);
    const soldInTier =
      tier.sold_in_tier !== undefined && tier.remaining_in_tier !== undefined && !item._overrideSold
        ? Number(tier.sold_in_tier)
        : Math.min(quantity, remainingSold);
    const remainingInTier =
      tier.sold_in_tier !== undefined && tier.remaining_in_tier !== undefined && !item._overrideSold
        ? Number(tier.remaining_in_tier)
        : Math.max(0, quantity - soldInTier);
    remainingSold = Math.max(0, remainingSold - Math.min(quantity, remainingSold));
    return {
      tier_index: Number(tier.tier_index || idx + 1),
      label: tier.label || `Bậc ${idx + 1}`,
      quantity,
      price,
      sold_in_tier: soldInTier,
      remaining_in_tier: remainingInTier,
    };
  });

  const currentIdx = tiers.findIndex((t) => t.remaining_in_tier > 0);
  const currentTier = currentIdx >= 0 ? tiers[currentIdx] : tiers[tiers.length - 1] || null;
  const nextTier = currentIdx >= 0 && currentIdx + 1 < tiers.length ? tiers[currentIdx + 1] : null;

  return {
    hasPriceTiers: Boolean(rawTiers && rawTiers.length > 1),
    tiers,
    currentTier,
    nextTier,
  };
}

export function calculateClientTierQuote(item, peopleCount = 1) {
  const people = Math.max(1, Number(peopleCount || 1));
  if (!item?.campaign_item_id) {
    const unit = Number(item?.promo_price || item?.price || 0);
    return {
      grandTotal: unit * people,
      effectiveUnitPrice: unit,
      breakdown: [],
      crossedTiers: false,
      currentTier: null,
      nextTier: null,
      hasPriceTiers: false,
      insufficientSlots: false,
    };
  }

  const state = computeClientTierState(item);
  if (!state.hasPriceTiers) {
    const unit = Number(state.currentTier?.price || item.promo_price || 0);
    return {
      grandTotal: unit * people,
      effectiveUnitPrice: unit,
      breakdown: [
        {
          tier_index: 1,
          label: state.currentTier?.label || "Giá Flash Sale",
          quantity: people,
          unit_price: unit,
          subtotal: unit * people,
        },
      ],
      crossedTiers: false,
      currentTier: state.currentTier,
      nextTier: state.nextTier,
      hasPriceTiers: false,
      insufficientSlots: false,
    };
  }

  let left = people;
  let grandTotal = 0;
  const breakdown = [];

  for (const tier of state.tiers) {
    if (left <= 0) break;
    const avail = Math.max(0, Number(tier.remaining_in_tier || 0));
    if (avail <= 0) continue;
    const take = Math.min(avail, left);
    const subtotal = take * Number(tier.price);
    grandTotal += subtotal;
    left -= take;
    breakdown.push({
      tier_index: tier.tier_index,
      label: tier.label,
      quantity: take,
      unit_price: Number(tier.price),
      subtotal,
    });
  }

  const insufficientSlots = left > 0;
  if (insufficientSlots) {
    const fallbackPrice = Number(state.tiers[state.tiers.length - 1]?.price || item.promo_price || 0);
    grandTotal += left * fallbackPrice;
  }

  return {
    grandTotal,
    effectiveUnitPrice: Math.round(grandTotal / people),
    breakdown,
    crossedTiers: breakdown.length > 1,
    currentTier: state.currentTier,
    nextTier: state.nextTier,
    hasPriceTiers: true,
    insufficientSlots,
  };
}
