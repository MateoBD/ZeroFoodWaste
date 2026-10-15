import { daysUntilExpiration, getExpirationUrgency } from '@/features/pantry/expirationUrgency';
import type { PantryItem } from '@/features/pantry/pantryItem';
import { normalizeIngredientQuery } from '../ingredientMatcher';
import { EXPIRED_WINDOW_DAYS, PRIORITY_MAX_DAYS } from './policy';
import type { PreparedPackage, PreparedPantry, SearchIngredient } from './types';

/** Orders package dates with recent expiry first, then upcoming dates. */
export function compareExpiration(first: PreparedPackage, second: PreparedPackage): number {
  const a = first.daysRemaining;
  const b = second.daysRemaining;
  if ((a < 0) !== (b < 0)) return a < 0 ? -1 : 1;
  return a < 0 ? b - a : a - b;
}

/**
 * Validates and indexes all eligible pantry packages for exact ingredient matching.
 *
 * Invalid dates, blank names, and packages older than seven days past expiry are ignored.
 * @param items - Active pantry packages.
 * @param today - Explicit local reference day.
 * @returns Immutable package and ingredient lookup views.
 */
export function preparePantry(items: readonly PantryItem[], today: Date): PreparedPantry {
  const packages: PreparedPackage[] = [];
  const groups = new Map<string, { name: string; packages: PreparedPackage[] }>();
  for (const item of items) {
    const daysRemaining = daysUntilExpiration(item.expirationDate, today);
    const urgency = getExpirationUrgency(item.expirationDate, today);
    const name = item.recipeIngredient?.name ?? item.name;
    const key = normalizeIngredientQuery(name);
    if (daysRemaining === null || urgency === null || daysRemaining < -EXPIRED_WINDOW_DAYS || !key) continue;
    const entry = { id: item.id, foodName: item.name, ingredientName: name, expirationDate: item.expirationDate, daysRemaining, urgency, priority: daysRemaining <= PRIORITY_MAX_DAYS };
    packages.push(entry);
    const group = groups.get(key);
    if (group) group.packages.push(entry);
    else groups.set(key, { name, packages: [entry] });
  }
  packages.sort((a, b) => compareExpiration(a, b) || a.id.localeCompare(b.id));
  const searches: SearchIngredient[] = [...groups.entries()].map(([key, group]) => ({
    key, name: group.name, packages: group.packages.sort((a, b) => compareExpiration(a, b) || a.id.localeCompare(b.id)),
  })).sort((a, b) => compareExpiration(a.packages[0], b.packages[0]) || a.key.localeCompare(b.key));
  return { packages, searches, byIngredient: new Map(searches.map((search) => [search.key, search.packages])) };
}
