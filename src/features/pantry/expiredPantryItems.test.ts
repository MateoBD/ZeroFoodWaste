import { getExpiredPantryItems } from './expiredPantryItems';
import type { PantryItem } from './pantryItem';

function item(id: string, expirationDate: string): PantryItem {
  return {
    id,
    name: id,
    recipeIngredient: null,
    expirationDate,
    quantity: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
  };
}

describe('getExpiredPantryItems', () => {
  const today = new Date(2026, 9, 22, 9);

  it('does not count an item expiring today', () => {
    expect(getExpiredPantryItems([item('milk', '2026-10-22')], today)).toEqual([]);
  });

  it('counts an item from the day after its expiration date', () => {
    expect(getExpiredPantryItems([item('milk', '2026-10-22')], new Date(2026, 9, 23, 0, 1)))
      .toEqual([item('milk', '2026-10-22')]);
  });

  it('returns only past-dated items in their original order', () => {
    const items = [
      item('rice', '2026-11-01'),
      item('bread', '2026-10-20'),
      item('milk', '2026-10-22'),
      item('eggs', '2025-12-31'),
    ];

    expect(getExpiredPantryItems(items, today).map(({ id }) => id)).toEqual(['bread', 'eggs']);
  });

  it('ignores invalid package dates', () => {
    expect(getExpiredPantryItems([item('broken', 'not-a-date')], today)).toEqual([]);
  });
});
