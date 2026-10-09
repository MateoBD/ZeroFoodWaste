import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeSummary } from '../recipe';

/** Device-local key for the user's favorite recipes. */
export const FAVORITE_RECIPES_STORAGE_KEY = 'zerofoodwaste.favorite-recipes.v1';

function isSummary(value: unknown): value is RecipeSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const recipe = value as Record<string, unknown>;
  return typeof recipe.id === 'string' && typeof recipe.name === 'string'
    && typeof recipe.provider === 'string'
    && (recipe.imageUrl === null || typeof recipe.imageUrl === 'string');
}

/**
 * Validates saved favorite-recipe JSON.
 * @param raw - Serialized storage value.
 * @returns Saved favorites, or an empty list when absent, corrupt, or unsupported.
 */
export function parseFavoriteRecipes(raw: string | null): RecipeSummary[] {
  if (raw === null) return [];
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return value.version === 1 && Array.isArray(value.recipes) && value.recipes.every(isSummary)
      ? value.recipes : [];
  } catch {
    return [];
  }
}

/** AsyncStorage boundary for favorite recipes. */
export const favoriteRecipeStorage = {
  /** @returns Saved favorite recipes, newest first. @throws When storage cannot be read. */
  async load(): Promise<RecipeSummary[]> {
    return parseFavoriteRecipes(await AsyncStorage.getItem(FAVORITE_RECIPES_STORAGE_KEY));
  },
  /** @param recipes - The complete favorites list to persist. @returns When the write completes. @throws On write failure. */
  async save(recipes: readonly RecipeSummary[]): Promise<void> {
    await AsyncStorage.setItem(FAVORITE_RECIPES_STORAGE_KEY, JSON.stringify({ version: 1, recipes }));
  },
};
