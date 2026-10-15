import { compareExpiration } from './preparation';
import type { IngredientMatch, RecommendationScore } from './types';

/**
 * Counts distinct verified ingredient matches and their closest expiration.
 * @param matches - Distinct recipe ingredient matches.
 * @returns The priority count, total count, and expiration tie breaker.
 */
export function scoreMatches(matches: readonly IngredientMatch[]): RecommendationScore {
  const nearest = matches.flatMap((match) => match.packages).sort(compareExpiration)[0];
  return {
    priorityMatchCount: matches.filter((match) => match.packages.some((item) => item.priority)).length,
    totalMatchCount: matches.length,
    nearestExpirationDays: nearest?.daysRemaining ?? Number.POSITIVE_INFINITY,
  };
}
