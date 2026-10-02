import { getMostUrgentPantryItem } from './mostUrgentPantryItem';
import type { PantryItem } from './pantryItem';
import { useRecipeSearch } from '@/features/recipes/useRecipeSearch';

/**
 * Selects the most urgent pantry item and automatically searches its linked ingredient.
 *
 * @param items - The current pantry items.
 * @returns The urgent item and its recipe search results.
 */
export function useUrgentRecipeSuggestions(items: readonly PantryItem[]) {
  const urgentItem = getMostUrgentPantryItem(items);
  const ingredient = urgentItem?.recipeIngredient ?? null;
  const search = useRecipeSearch(ingredient?.name ?? null);

  return { urgentItem, ingredient, recipes: search.items, status: search.status };
}
