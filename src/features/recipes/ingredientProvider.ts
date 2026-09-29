import type { IngredientCatalogEntry } from './ingredient';

/**
 * Defines the boundary for loading canonical ingredient entries.
 *
 * Provider failures reject the request so callers can keep manual entry usable.
 */
export interface IngredientCatalogProvider {
  /**
   * Loads every available canonical ingredient.
   *
   * @returns The provider's ingredient catalogue.
   * @throws When the provider request or response decoding fails.
   */
  listIngredients(): Promise<IngredientCatalogEntry[]>;
}
