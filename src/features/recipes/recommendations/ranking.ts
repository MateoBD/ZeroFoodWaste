import type { Recommendation } from './types';

/**
 * Orders verified recipes by priority matches, total matches, then expiry and identity.
 * @param first - First recommendation.
 * @param second - Second recommendation.
 * @returns Comparator result with deterministic name and provider ID ties.
 */
export function compareRecommendations(first: Recommendation, second: Recommendation): number {
  const a = first.score;
  const b = second.score;
  if (a.priorityMatchCount !== b.priorityMatchCount) return b.priorityMatchCount - a.priorityMatchCount;
  if (a.totalMatchCount !== b.totalMatchCount) return b.totalMatchCount - a.totalMatchCount;
  const ad = a.nearestExpirationDays;
  const bd = b.nearestExpirationDays;
  if ((ad < 0) !== (bd < 0)) return ad < 0 ? -1 : 1;
  if (ad !== bd) return ad < 0 ? bd - ad : ad - bd;
  return first.recipe.name.localeCompare(second.recipe.name) || first.recipe.provider.localeCompare(second.recipe.provider) || first.recipe.id.localeCompare(second.recipe.id);
}
