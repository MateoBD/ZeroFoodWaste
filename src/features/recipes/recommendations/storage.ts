import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeDetail } from '../recipe';

/** Device-local key for verified recommendation data. */
export const RECOMMENDATION_STORAGE_KEY = 'zerofoodwaste.recipe-recommendations.v1';

/** Time after which saved recipes are refreshed in the background. */
export const RECOMMENDATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Successful recipe data retained across application launches. */
export type RecommendationCache = Readonly<{
  fetchedAt: string;
  searchedIngredients: readonly string[];
  details: readonly RecipeDetail[];
}>;

function isDetail(value: unknown): value is RecipeDetail {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const detail = value as Record<string, unknown>;
  return typeof detail.id === 'string' && typeof detail.name === 'string'
    && typeof detail.provider === 'string' && Array.isArray(detail.ingredients)
    && detail.ingredients.every((ingredient) => {
      if (typeof ingredient !== 'object' || ingredient === null || Array.isArray(ingredient)) return false;
      const entry = ingredient as Record<string, unknown>;
      return typeof entry.name === 'string' && (entry.measure === null || typeof entry.measure === 'string');
    })
    && typeof detail.instructions === 'string'
    && (detail.imageUrl === null || typeof detail.imageUrl === 'string')
    && (detail.sourceUrl === null || typeof detail.sourceUrl === 'string');
}

/**
 * Validates saved recommendation JSON.
 * @param raw - Serialized storage value.
 * @returns Valid saved data, or null when absent, corrupt, or unsupported.
 */
export function parseRecommendationCache(raw: string | null): RecommendationCache | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== 1 || typeof value.fetchedAt !== 'string'
      || Number.isNaN(new Date(value.fetchedAt).getTime())
      || !Array.isArray(value.searchedIngredients)
      || value.searchedIngredients.some((name) => typeof name !== 'string')
      || !Array.isArray(value.details) || value.details.some((detail) => !isDetail(detail))) return null;
    return {
      fetchedAt: value.fetchedAt,
      searchedIngredients: value.searchedIngredients as string[],
      details: value.details as RecipeDetail[],
    };
  } catch {
    return null;
  }
}

/** AsyncStorage boundary for recommendation data. */
export const recommendationStorage = {
  /** @returns Valid saved recommendation data, or null. @throws When storage cannot be read. */
  async load(): Promise<RecommendationCache | null> {
    return parseRecommendationCache(await AsyncStorage.getItem(RECOMMENDATION_STORAGE_KEY));
  },
  /** @param cache - Successful data to persist. @returns When the write completes. @throws On write failure. */
  async save(cache: RecommendationCache): Promise<void> {
    await AsyncStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify({ version: 1, ...cache }));
  },
};
