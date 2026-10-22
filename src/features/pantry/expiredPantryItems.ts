import { daysUntilExpiration } from './expirationUrgency';
import type { PantryItem } from './pantryItem';

/**
 * Selects active pantry items whose package date is before today.
 *
 * An item expiring today is still usable and is not returned; it becomes
 * expired on the following local calendar day. Input order is preserved.
 *
 * @param items - The active pantry items.
 * @param today - The local date used as today. Defaults to the current date.
 * @returns The items that need a consumed or thrown-away answer.
 */
export function getExpiredPantryItems(items: readonly PantryItem[], today: Date = new Date()): PantryItem[] {
  return items.filter((item) => {
    const days = daysUntilExpiration(item.expirationDate, today);
    return days !== null && days < 0;
  });
}
