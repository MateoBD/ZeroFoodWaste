import { useLocalSearchParams } from 'expo-router';

import { RecipeResultsScreen } from '@/features/recipes/RecipeResultsScreen';

import { readRouteParam } from '../routeParam';

/**
 * Route that lists recipes matching the ingredient selected from the pantry.
 *
 * @returns The recipe-results screen for the current ingredient route parameter.
 */
export default function RecipeResultsRoute() {
  const { ingredient } = useLocalSearchParams<{ ingredient?: string | string[] }>();

  return <RecipeResultsScreen ingredient={readRouteParam(ingredient)} />;
}
