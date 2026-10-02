import type { PantryItem } from './pantryItem';
import { sortPantryItemsByExpiration } from './sortPantryItems';

function item(id: string, name: string, expirationDate: string, createdAt = '2026-01-01T00:00:00.000Z'): PantryItem {
  return { id, name, expirationDate, createdAt, recipeIngredient: null };
}

function ids(items: PantryItem[]) {
  return items.map((entry) => entry.id);
}

describe('sortPantryItemsByExpiration', () => {
  it('puts the closest expiration date first, across months and years', () => {
    const items = [
      item('c', 'Rice', '2027-01-05'),
      item('a', 'Milk', '2026-10-02'),
      item('b', 'Eggs', '2026-12-31'),
    ];

    expect(ids(sortPantryItemsByExpiration(items))).toEqual(['a', 'b', 'c']);
  });

  it('places a newly added item in its sorted position, not at the end', () => {
    const existing = [item('a', 'Milk', '2026-10-02'), item('c', 'Rice', '2026-10-20')];

    const sorted = sortPantryItemsByExpiration([...existing, item('b', 'Bread', '2026-10-05')]);

    expect(ids(sorted)).toEqual(['a', 'b', 'c']);
  });

  it('always puts items without a valid expiration date last', () => {
    const items = [
      item('missing', 'Salt', ''),
      item('late', 'Rice', '2999-01-01'),
      item('invalid', 'Flour', '2026-02-31'),
      item('soon', 'Milk', '2026-10-02'),
    ];

    expect(ids(sortPantryItemsByExpiration(items))).toEqual(['soon', 'late', 'invalid', 'missing']);
  });

  it('orders items with the same date by name, then by creation time', () => {
    const items = [
      item('second-apple', 'apple', '2026-10-02', '2026-01-02T00:00:00.000Z'),
      item('banana', 'Banana', '2026-10-02'),
      item('first-apple', 'Apple', '2026-10-02', '2026-01-01T00:00:00.000Z'),
    ];

    expect(ids(sortPantryItemsByExpiration(items))).toEqual(['first-apple', 'second-apple', 'banana']);
  });

  it('does not change the input array', () => {
    const items = [item('b', 'Rice', '2026-10-20'), item('a', 'Milk', '2026-10-02')];

    sortPantryItemsByExpiration(items);

    expect(ids(items)).toEqual(['b', 'a']);
  });
});
