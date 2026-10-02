import { getMostUrgentPantryItem } from './mostUrgentPantryItem';
import type { PantryItem } from './pantryItem';

function pantryItem(id: string, expirationDate: string): PantryItem {
  return {
    id,
    name: id,
    recipeIngredient: null,
    expirationDate,
    createdAt: '2026-09-01T10:00:00.000Z',
  };
}

describe('getMostUrgentPantryItem', () => {
  it('returns null for an empty pantry', () => {
    expect(getMostUrgentPantryItem([])).toBeNull();
  });

  it('selects the item with the nearest expiration date regardless of list order', () => {
    const items = [
      pantryItem('later', '2026-10-20'),
      pantryItem('soonest', '2026-10-03'),
      pantryItem('middle', '2026-10-12'),
    ];

    expect(getMostUrgentPantryItem(items)).toBe(items[1]);
  });

  it('keeps the first item when expiration dates are equal', () => {
    const items = [
      pantryItem('first', '2026-10-03'),
      pantryItem('second', '2026-10-03'),
    ];

    expect(getMostUrgentPantryItem(items)).toBe(items[0]);
  });
});