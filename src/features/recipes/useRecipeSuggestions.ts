import { useEffect, useMemo, useState } from 'react';

import type { PantryItem } from '@/features/pantry/pantryItem';

import { theMealDbRecipeProvider } from './api/theMealDbClient';
import {
  combineRecipeSuggestions,
  selectEligiblePantryItems,
  type RecipeSuggestion,
} from './recipeSuggestions';

/** Current network state for the automatic recipe suggestion list. */
export type RecipeSuggestionsStatus = 'idle' | 'loading' | 'ready' | 'partial' | 'error';

type SuggestionState = Readonly<{
  requestKey: string;
  items: readonly RecipeSuggestion[];
  status: RecipeSuggestionsStatus;
}>;

/**
 * Loads and combines recipes for every eligible linked pantry ingredient.
 *
 * Searches run in small batches and retain successful results if another
 * ingredient request fails. Increment retryToken to retry the current pantry.
 *
 * @param pantryItems - Active pantry items used to choose ingredient searches.
 * @param retryToken - Value changed by the caller to retry failed requests.
 * @returns Eligible packages, recipe suggestions, and the aggregate request state.
 */
export function useRecipeSuggestions(pantryItems: readonly PantryItem[], retryToken = 0) {
  const eligibleItems = useMemo(() => selectEligiblePantryItems(pantryItems), [pantryItems]);
  const searchKey = eligibleItems.map((item) => (
    `${item.id}:${item.foodName}:${item.expirationDate}:${item.ingredientId}:${item.ingredientName}`
  )).join('|');
  const requestKey = `${searchKey}:${retryToken}`;
  const [state, setState] = useState<SuggestionState>({ requestKey: '', items: [], status: 'idle' });

  useEffect(() => {
    let isActive = true;
    if (eligibleItems.length === 0) {
      return () => { isActive = false; };
    }

    async function load() {
      const ingredientNames = [...new Set(eligibleItems.map((item) => item.ingredientName))];
      const results = new Map<string, Awaited<ReturnType<typeof theMealDbRecipeProvider.searchByIngredient>>>();
      let failureCount = 0;
      let nextIndex = 0;

      async function worker() {
        while (nextIndex < ingredientNames.length) {
          const ingredient = ingredientNames[nextIndex];
          nextIndex += 1;
          try {
            results.set(ingredient, await theMealDbRecipeProvider.searchByIngredient(ingredient));
          } catch {
            failureCount += 1;
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(3, ingredientNames.length) }, () => worker()));
      if (!isActive) return;

      const successfulSearches = eligibleItems.flatMap((pantryItem) => {
        const recipes = results.get(pantryItem.ingredientName);
        return recipes ? [{ pantryItem, recipes }] : [];
      });
      const items = combineRecipeSuggestions(successfulSearches);
      const status = failureCount === ingredientNames.length
        ? 'error'
        : failureCount > 0 ? 'partial' : 'ready';
      setState({ requestKey, items, status });
    }

    void load();
    return () => { isActive = false; };
  // requestKey intentionally represents every eligible item field used above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  if (eligibleItems.length === 0) return { eligibleItems, items: [], status: 'idle' as const };
  if (state.requestKey !== requestKey) return { eligibleItems, items: [], status: 'loading' as const };
  return { eligibleItems, items: state.items, status: state.status };
}
