import { useLocalSearchParams } from 'expo-router';

import { ConnectedRecipeDetailScreen } from '@/features/recipes/RecipeDetailScreen';

import { readRouteParam } from '../routeParam';

/**
 * Route that displays the full details for a selected recipe.
 *
 * @returns The recipe-detail screen for the current meal route parameter.
 */
export default function RecipeDetailRoute() {
  const { mealId } = useLocalSearchParams<{ mealId?: string | string[] }>();

  return <ConnectedRecipeDetailScreen mealId={readRouteParam(mealId)} />;
}
