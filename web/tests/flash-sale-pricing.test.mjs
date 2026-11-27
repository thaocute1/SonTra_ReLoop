import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateClientTierQuote, computeClientTierState } from '../src/utils/flashSalePricing.js'

const tieredItem = {
  campaign_item_id: 9,
  promo_price: 300000,
  flash_slot_quantity: 8,
  flash_sold_quantity: 2,
  price_tiers: [
    { tier_index: 1, label: 'Bậc 1', quantity: 3, price: 300000 },
    { tier_index: 2, label: 'Bậc 2', quantity: 5, price: 380000 },
  ],
}

test('computeClientTierState calculates remaining slots and next tier dynamically from sold_quantity', () => {
  const state = computeClientTierState(tieredItem)
  assert.equal(state.hasPriceTiers, true)
  assert.equal(state.currentTier.tier_index, 1)
  assert.equal(state.currentTier.remaining_in_tier, 1)
  assert.equal(state.nextTier.price, 380000)

  const rolledBack = computeClientTierState({ ...tieredItem, flash_sold_quantity: 1, _overrideSold: true })
  assert.equal(rolledBack.currentTier.remaining_in_tier, 2)
})

test('calculateClientTierQuote splits price across tier boundary when guests exceed current tier slots', () => {
  const quote = calculateClientTierQuote(tieredItem, 2)
  assert.equal(quote.crossedTiers, true)
  assert.equal(quote.grandTotal, 680000)
  assert.equal(quote.effectiveUnitPrice, 340000)
  assert.equal(quote.breakdown.length, 2)
  assert.deepEqual(quote.breakdown[0], {
    tier_index: 1,
    label: 'Bậc 1',
    quantity: 1,
    unit_price: 300000,
    subtotal: 300000,
  })
  assert.deepEqual(quote.breakdown[1], {
    tier_index: 2,
    label: 'Bậc 2',
    quantity: 1,
    unit_price: 380000,
    subtotal: 380000,
  })
})

test('calculateClientTierQuote handles single-price flash sale items', () => {
  const single = { campaign_item_id: 10, promo_price: 250000, flash_slot_quantity: 5, flash_sold_quantity: 1 }
  const quote = calculateClientTierQuote(single, 3)
  assert.equal(quote.hasPriceTiers, false)
  assert.equal(quote.crossedTiers, false)
  assert.equal(quote.grandTotal, 750000)
})
