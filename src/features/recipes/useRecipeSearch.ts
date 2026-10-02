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
export function useRecipeSearch(ingredient: string | null) {
  const [state, setState] = useState<RecipeSearchState>({
    ingredient: ingredient ?? '',
    items: [],
    status: ingredient === null ? 'ready' : 'loading',
  });

  useEffect(() => {
    if (ingredient === null) return;

    let isActive = true;
    const searchIngredient = ingredient;

    /**
     * Fetches recipes and applies the result while this hook remains mounted.
     *
     * @returns A promise that resolves after the request result has been handled.
     */
    async function loadRecipes() {
      try {
        const recipes = await theMealDbRecipeProvider.searchByIngredient(searchIngredient);
        if (!isActive) return;
        setState({ ingredient: searchIngredient, items: recipes, status: 'ready' });
      } catch {
        if (isActive) setState({ ingredient: searchIngredient, items: [], status: 'error' });
      }
    }

    void loadRecipes();
    return () => {
      isActive = false;
    };
  }, [ingredient]);

  if (ingredient === null) return { items: [], status: 'ready' as const };

  return state.ingredient === ingredient
    ? { items: state.items, status: state.status }
    : { items: [], status: 'loading' as const };
}
