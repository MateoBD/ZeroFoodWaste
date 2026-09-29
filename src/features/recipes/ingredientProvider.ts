import type { IngredientCatalogEntry } from './ingredient';

export interface IngredientCatalogProvider {
  listIngredients(): Promise<IngredientCatalogEntry[]>;
}
