import type { PantryItem } from './pantryItem';

/**
 * Selects the pantry item with the nearest expiration date.
 *
 * Equal dates preserve the item's existing pantry order.
 *
 * @param items - The current pantry items.
 * @returns The item expiring soonest, or `null` when the pantry is empty.
 */
export function getMostUrgentPantryItem(items: readonly PantryItem[]): PantryItem | null {
  let mostUrgentItem: PantryItem | null = null;

  for (const item of items) {
    if (mostUrgentItem === null || item.expirationDate < mostUrgentItem.expirationDate) {
      mostUrgentItem = item;
    }
  }

  return mostUrgentItem;
}