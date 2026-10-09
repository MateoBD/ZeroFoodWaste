import { useEffect, useState } from 'react';

import { recipeRequestCache } from './recommendations/sharedCache';
import type { RecipeDetail } from './recipe';

export type RecipeDetailStatus = 'loading' | 'ready' | 'error';

type RecipeDetailState = {
  mealId: string;
  item: RecipeDetail | null;
  status: RecipeDetailStatus;
};

/**
 * Loads the full details for one TheMealDB recipe ID.
 *
 * @param mealId - The TheMealDB identifier of the selected recipe.
 * @returns The recipe detail and its loading status.
 */
export function useRecipeDetail(mealId: string) {
  const [state, setState] = useState<RecipeDetailState>({ mealId, item: null, status: 'loading' });

  useEffect(() => {
    let isActive = true;

    /**
     * Fetches recipe details and applies the result while this hook remains mounted.
     *
     * @returns A promise that resolves after the request result has been handled.
     */
    async function loadRecipe() {
      try {
        const recipe = await recipeRequestCache.detail(mealId);
        if (!isActive) return;
        setState({ mealId, item: recipe, status: 'ready' });
      } catch {
        if (isActive) setState({ mealId, item: null, status: 'error' });
      }
    }

    void loadRecipe();
    return () => {
      isActive = false;
    };
  }, [mealId]);

  return state.mealId === mealId
    ? { item: state.item, status: state.status }
    : { item: null, status: 'loading' as const };
}
