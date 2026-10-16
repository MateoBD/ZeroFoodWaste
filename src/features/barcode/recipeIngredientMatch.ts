import type { IngredientCatalogEntry } from '@/features/recipes/ingredient';
import { normalizeIngredientQuery } from '@/features/recipes/ingredientMatcher';

const ALIASES: Readonly<Record<string, string>> = {
  milks: 'milk',
  'chicken meat': 'chicken',
};

/**
 * Finds the first scanned food candidate present in TheMealDB's catalogue.
 *
 * Exact names, safe aliases, and simple plurals are accepted. Fuzzy spelling
 * matches remain available only through the user's manual ingredient search.
 *
 * @param candidates - Candidate names in Open Food Facts source priority order.
 * @param catalog - Canonical TheMealDB ingredients.
 * @returns A verified catalogue entry, or null when none matches.
 */
export function matchScannedRecipeIngredient(
  candidates: readonly string[],
  catalog: readonly IngredientCatalogEntry[],
): IngredientCatalogEntry | null {
  const byName = new Map(catalog.map((item) => [normalizeIngredientQuery(item.name), item]));
  for (const candidate of candidates) {
    const normalized = normalizeIngredientQuery(candidate);
    const alternatives = [normalized, ALIASES[normalized]];
    if (normalized.endsWith('ies')) alternatives.push(`${normalized.slice(0, -3)}y`);
    else if (normalized.endsWith('s') && !normalized.endsWith('ss')) alternatives.push(normalized.slice(0, -1));
    for (const name of alternatives) {
      if (name && byName.has(name)) return byName.get(name)!;
    }
  }
  return null;
}
