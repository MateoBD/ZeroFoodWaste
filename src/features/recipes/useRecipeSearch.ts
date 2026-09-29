import { useEffect, useState } from 'react';

import { theMealDbRecipeProvider } from './api/theMealDbClient';
import type { RecipeSummary } from './recipe';

export type RecipeSearchStatus = 'loading' | 'ready' | 'error';

type RecipeSearchState = {
  ingredient: string;
  items: RecipeSummary[];
  status: RecipeSearchStatus;
};

/**
 * Loads recipes matching one canonical ingredient name.
 *
 * @param ingredient - The canonical ingredient name used for the API search.
 * @returns The matching recipes and their loading status.
 */
export function useRecipeSearch(ingredient: string) {
  const [state, setState] = useState<RecipeSearchState>({
    ingredient,
    items: [],
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    /**
     * Fetches recipes and applies the result while this hook remains mounted.
     *
     * @returns A promise that resolves after the request result has been handled.
     */
    async function loadRecipes() {
      try {
        const recipes = await theMealDbRecipeProvider.searchByIngredient(ingredient);
        if (!isActive) return;
        setState({ ingredient, items: recipes, status: 'ready' });
      } catch {
        if (isActive) setState({ ingredient, items: [], status: 'error' });
      }
    }

    void loadRecipes();
    return () => {
      isActive = false;
    };
  }, [ingredient]);

  return state.ingredient === ingredient
    ? { items: state.items, status: state.status }
    : { items: [], status: 'loading' as const };
}
