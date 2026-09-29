import type { RecipeDetail, RecipeSummary } from './recipe';

/**
 * Recipe service boundary. An empty array means no ingredient matches; null
 * means the requested recipe ID was not found. Service failures reject so the
 * future recipe UI can show an error without affecting pantry management.
 */
export interface RecipeProvider {
  searchByIngredient(ingredient: string): Promise<RecipeSummary[]>;
  getById(mealId: string): Promise<RecipeDetail | null>;
}
