import { normalizeIngredientQuery } from '../ingredientMatcher';
import type { RecipeDetail, RecipeIngredient } from '../recipe';
import type { IngredientMatch, PreparedPantry } from './types';

/**
 * Verifies distinct recipe ingredients against prepared canonical or manual names.
 * @param recipe - Complete provider recipe with ingredients.
 * @param pantry - Prepared eligible pantry packages.
 * @returns Matched packages and ingredients absent from the pantry.
 */
export function matchRecipe(recipe: RecipeDetail, pantry: PreparedPantry): { matches: IngredientMatch[]; missing: RecipeIngredient[] } {
  const seen = new Set<string>();
  const matches: IngredientMatch[] = [];
  const missing: RecipeIngredient[] = [];
  for (const ingredient of recipe.ingredients) {
    const key = normalizeIngredientQuery(ingredient.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const packages = pantry.byIngredient.get(key) ?? [];
    if (packages.length) matches.push({ ingredient, packages });
    else missing.push(ingredient);
  }
  return { matches, missing };
}
