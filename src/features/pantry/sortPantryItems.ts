import { isValidCalendarDate } from './calendarDate';
import type { PantryItem } from './pantryItem';

/**
 * Compares pantry items so the closest expiration date comes first.
 *
 * Items without a valid expiration date always come last. Items with the same
 * date are ordered by name, then by creation time, so the order is stable.
 *
 * @param a - The first item.
 * @param b - The second item.
 * @returns A negative number when `a` comes first, a positive number when `b` comes first, or 0.
 */
export function comparePantryItemsByExpiration(a: PantryItem, b: PantryItem): number {
  const aHasDate = isValidCalendarDate(a.expirationDate);
  const bHasDate = isValidCalendarDate(b.expirationDate);
  if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;

  // YYYY-MM-DD strings sort in calendar order without parsing them as instants.
  if (aHasDate && a.expirationDate !== b.expirationDate) return a.expirationDate < b.expirationDate ? -1 : 1;

  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) return byName;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Returns a copy of the pantry items ordered by closest expiration date first.
 *
 * @param items - The items to order. The input array is not changed.
 * @returns A new array sorted with {@link comparePantryItemsByExpiration}.
 */
export function sortPantryItemsByExpiration(items: readonly PantryItem[]): PantryItem[] {
  return [...items].sort(comparePantryItemsByExpiration);
}
