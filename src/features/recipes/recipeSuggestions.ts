import { daysUntilExpiration, getExpirationUrgency, type ExpirationUrgency } from '@/features/pantry/expirationUrgency';
import type { PantryItem } from '@/features/pantry/pantryItem';

import type { RecipeSummary } from './recipe';
import { normalizeIngredientQuery } from './ingredientMatcher';

/** A pantry package eligible to drive recipe suggestions. */
export type EligiblePantryItem = Readonly<{
  id: string;
  foodName: string;
  ingredientId: string;
  ingredientName: string;
  expirationDate: string;
  daysRemaining: number;
  urgency: ExpirationUrgency;
}>;

/** One recipe with every eligible pantry package that led to it. */
export type RecipeSuggestion = Readonly<{
  recipe: RecipeSummary;
  matches: readonly EligiblePantryItem[];
}>;

/**
 * Selects linked packages expired within seven days or expiring within five days.
 *
 * Recently expired packages come first, nearest past expiry first. Remaining
 * packages follow from today through the existing five-day "soon" boundary.
 *
 * @param items - Active pantry items.
 * @param today - Local calendar day used for expiry calculations.
 * @returns Eligible packages in suggestion priority order.
 */
export function selectEligiblePantryItems(
  items: readonly PantryItem[],
  today: Date = new Date(),
): EligiblePantryItem[] {
  return items
    .flatMap((item) => {
      const daysRemaining = daysUntilExpiration(item.expirationDate, today);
      const urgency = getExpirationUrgency(item.expirationDate, today);
      if (!item.recipeIngredient || daysRemaining === null || urgency === null) return [];
      if (daysRemaining < -7 || daysRemaining > 5) return [];
      return [{
        id: item.id,
        foodName: item.name,
        ingredientId: item.recipeIngredient.id,
        ingredientName: item.recipeIngredient.name,
        expirationDate: item.expirationDate,
        daysRemaining,
        urgency,
      }];
    })
    .sort((first, second) => {
      const firstExpired = first.daysRemaining < 0;
      const secondExpired = second.daysRemaining < 0;
      if (firstExpired !== secondExpired) return firstExpired ? -1 : 1;
      if (firstExpired) return second.daysRemaining - first.daysRemaining;
      return first.daysRemaining - second.daysRemaining;
    });
}

/**
 * Combines ingredient searches into one deduplicated, priority-ordered list.
 *
 * @param searches - Search results paired with their eligible pantry packages.
 * @returns Recipes shown once with all pantry packages whose search returned them.
 */
export function combineRecipeSuggestions(
  searches: readonly Readonly<{ pantryItem: EligiblePantryItem; recipes: readonly RecipeSummary[] }>[],
): RecipeSuggestion[] {
  const byRecipeId = new Map<string, { recipe: RecipeSummary; matches: EligiblePantryItem[] }>();

  for (const { pantryItem, recipes } of searches) {
    for (const recipe of recipes) {
      const existing = byRecipeId.get(recipe.id);
      if (existing) {
        if (!existing.matches.some((match) => match.id === pantryItem.id)) existing.matches.push(pantryItem);
      } else {
        byRecipeId.set(recipe.id, { recipe, matches: [pantryItem] });
      }
    }
  }

  return [...byRecipeId.values()];
}

/**
 * Finds pantry packages represented by one recipe ingredient.
 *
 * Explicit canonical links and exact normalized manual food names both match.
 *
 * @param ingredientName - Ingredient name from a complete recipe.
 * @param pantryItems - Active pantry packages to compare.
 * @returns Matching packages ordered by their expiration date.
 */
export function matchPantryItemsToRecipeIngredient(
  ingredientName: string,
  pantryItems: readonly PantryItem[],
): PantryItem[] {
  const normalizedIngredient = normalizeIngredientQuery(ingredientName);
  return pantryItems
    .filter((item) => (
      normalizeIngredientQuery(item.name) === normalizedIngredient
      || (item.recipeIngredient
        ? normalizeIngredientQuery(item.recipeIngredient.name) === normalizedIngredient
        : false)
    ))
    .sort((first, second) => first.expirationDate.localeCompare(second.expirationDate));
}
