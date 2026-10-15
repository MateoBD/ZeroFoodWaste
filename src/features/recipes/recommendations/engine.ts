import type { PantryItem } from '@/features/pantry/pantryItem';
import type { RecipeDetail } from '../recipe';
import { matchRecipe } from './matching';
import { preparePantry } from './preparation';
import { compareRecommendations } from './ranking';
import { scoreMatches } from './scoring';
import type { Recommendation } from './types';

/**
 * Composes pure preparation, verification, scoring, and ranking rules.
 * @param items - Active pantry packages.
 * @param recipes - Complete provider recipes.
 * @param today - Explicit local reference day.
 * @returns Ranked recipes with at least one verified ingredient presence.
 */
export function recommendRecipes(items: readonly PantryItem[], recipes: readonly RecipeDetail[], today: Date): Recommendation[] {
  const pantry = preparePantry(items, today);
  return recipes.flatMap((recipe) => {
    const { matches, missing } = matchRecipe(recipe, pantry);
    return matches.length ? [{ recipe, matches, missing, score: scoreMatches(matches) }] : [];
  }).sort(compareRecommendations);
}
