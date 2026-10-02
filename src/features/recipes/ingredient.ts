/**
 * Identifies a canonical TheMealDB ingredient retained with a pantry item.
 */
export type IngredientReference = Readonly<{
  provider: 'themealdb';
  id: string;
  name: string;
}>;

/**
 * Represents an ingredient available for English-name autocomplete.
 */
export type IngredientCatalogEntry = IngredientReference;
