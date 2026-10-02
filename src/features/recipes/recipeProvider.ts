import type { RecipeDetail, RecipeSummary } from './recipe';

/**
 * Defines the boundary for recipe search and detail lookup.
 *
 * An empty search result means no ingredient matches. A null detail means the
 * requested recipe ID was not found. Service failures reject so recipe errors
 * never interrupt pantry management.
 */
export interface RecipeProvider {
  /**
   * Searches for recipes containing one canonical ingredient.
   *
   * @param ingredient - The canonical ingredient name to search for.
   * @returns Matching recipe summaries, or an empty array when no meals match.
   * @throws When the provider request or response decoding fails.
   */
  searchByIngredient(ingredient: string): Promise<RecipeSummary[]>;
  /**
   * Loads the full details for one provider meal ID.
   *
   * @param mealId - The stable provider ID of the selected meal.
   * @returns The recipe detail, or null when the meal is not found.
   * @throws When the lookup is unavailable or the provider request fails.
   */
  getById(mealId: string): Promise<RecipeDetail | null>;
}
