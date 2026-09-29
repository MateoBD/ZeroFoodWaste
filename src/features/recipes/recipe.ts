/** A recipe returned by an ingredient search. Full details require a lookup. */
export type RecipeSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  provider: string;
};

export type RecipeIngredient = {
  name: string;
  measure: string | null;
};

export type RecipeDetail = RecipeSummary & {
  ingredients: RecipeIngredient[];
  instructions: string;
  sourceUrl: string | null;
};
