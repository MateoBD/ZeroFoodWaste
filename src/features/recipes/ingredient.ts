export type IngredientReference = Readonly<{
  provider: 'themealdb';
  id: string;
  name: string;
}>;

export type IngredientCatalogEntry = IngredientReference;
