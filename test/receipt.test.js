import { describe, it, expect } from 'vitest'
import { isCarrierBag } from '../server/core.js'

describe('isCarrierBag — keeps carrier bags off the receipt', () => {
  it('drops the many names a carrier bag appears under', () => {
    for (const name of [
      'Carrier Bag', 'CARRIER BAG', 'Bag for Life', 'Bags for Life', 'Bag 4 Life',
      '5p Bag', '10p Carrier Bag', 'Reusable Bag', 'Single-Use Bag', 'Shopping Bag',
      'Jute Bag', 'BAG', 'BAGS', 'Bag Charge'
    ]) {
      expect(isCarrierBag(name), name).toBe(true)
    }
  })

  it('never drops real foods/products that merely contain "bag"', () => {
    for (const name of [
      'Tea Bags', 'Bag Salad', 'Bag of Apples', 'Freezer Bags', 'Sandwich Bags',
      'Bin Bags', 'Whole Milk', 'Cheddar'
    ]) {
      expect(isCarrierBag(name), name).toBe(false)
    }
  })
})
