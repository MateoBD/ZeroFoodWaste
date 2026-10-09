/**
 * Represents a recipe returned by an ingredient search.
 *
 * Full ingredients and instructions require a separate meal-ID lookup.
 */
export type RecipeSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  provider: string;
};

/**
 * Represents an ingredient and its optional quantity text in a recipe detail.
 */
export type RecipeIngredient = {
  name: string;
  measure: string | null;
};

/**
 * Represents the full recipe data expected from a meal-ID lookup.
 */
export type RecipeDetail = RecipeSummary & {
  ingredients: RecipeIngredient[];
  instructions: string;
  sourceUrl: string | null;
  /** Provider category; absent on recipes saved before categories were stored. */
  category?: string | null;
};
