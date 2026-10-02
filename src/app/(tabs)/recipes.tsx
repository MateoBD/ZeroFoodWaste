import { useLocalSearchParams } from 'expo-router';

import { RecipeSuggestionsScreen } from '@/features/recipes/RecipeSuggestionsScreen';

import { readRouteParam } from '../recipes/routeParam';

/**
 * Composes the automatic recipe suggestions tab.
 *
 * @returns Suggestions for the urgent foods in the shared pantry.
 */
export default function RecipeSuggestionsTabRoute() {
  const { ingredient } = useLocalSearchParams<{ ingredient?: string | string[] }>();
  const initialIngredient = readRouteParam(ingredient) || undefined;
  return <RecipeSuggestionsScreen key={initialIngredient ?? 'all'} initialIngredient={initialIngredient} />;
}
