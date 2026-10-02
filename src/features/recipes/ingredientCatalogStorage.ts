import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IngredientCatalogEntry } from './ingredient';

/**
 * Represents a cached ingredient catalogue and its canonical fetch timestamp.
 */
export type IngredientCatalogCache = Readonly<{
  fetchedAt: string;
  items: IngredientCatalogEntry[];
}>;

type StoredIngredientCatalog = {
  version: 1;
  fetchedAt: string;
  items: IngredientCatalogEntry[];
};

/**
 * Identifies the version 1 TheMealDB ingredient catalogue in AsyncStorage.
 */
export const INGREDIENT_CATALOG_STORAGE_KEY = 'zerofoodwaste.themealdb-ingredients.v1';

/**
 * Defines the ingredient catalogue freshness period in milliseconds.
 *
 * The current cache remains fresh for 24 hours after it is fetched.
 */
export const INGREDIENT_CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isIngredient(value: unknown): value is IngredientCatalogEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const ingredient = value as Record<string, unknown>;
  return (
    ingredient.provider === 'themealdb' &&
    typeof ingredient.id === 'string' && ingredient.id.trim().length > 0 &&
    typeof ingredient.name === 'string' && ingredient.name.trim().length > 0
  );
}

function isCanonicalTimestamp(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Parses a stored ingredient catalogue without exposing cache corruption.
 *
 * @param raw - Stored JSON, or null when no catalogue has been cached.
 * @returns The validated cache, or null for missing, malformed, or unsupported data.
 */
export function parseIngredientCatalogCache(raw: string | null): IngredientCatalogCache | null {
  if (raw === null) return null;

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (
      data.version !== 1 ||
      typeof data.fetchedAt !== 'string' ||
      !isCanonicalTimestamp(data.fetchedAt) ||
      !Array.isArray(data.items) ||
      data.items.some((item) => !isIngredient(item))
    ) {
      return null;
    }

    return { fetchedAt: data.fetchedAt, items: data.items as IngredientCatalogEntry[] };
  } catch {
    return null;
  }
}

/**
 * Serializes catalogue entries as a version 1 cache document.
 *
 * @param cache - The fetched timestamp and ingredient entries to store.
 * @returns The versioned catalogue document as JSON.
 */
export function encodeIngredientCatalogCache(cache: IngredientCatalogCache): string {
  const stored: StoredIngredientCatalog = { version: 1, ...cache };
  return JSON.stringify(stored);
}

/**
 * Stores the ingredient catalogue in device-local AsyncStorage.
 *
 * Read and write failures reject so the catalogue hook can apply its cache
 * fallback behavior without blocking the pantry form.
 */
export const asyncStorageIngredientCatalog = {
  /**
   * Loads and validates the cached ingredient catalogue.
   *
   * @returns The cached catalogue, or null when storage is empty or invalid.
   * @throws When AsyncStorage cannot be read.
   */
  async load(): Promise<IngredientCatalogCache | null> {
    return parseIngredientCatalogCache(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY));
  },
  /**
   * Replaces the cached ingredient catalogue.
   *
   * @param cache - The complete catalogue cache to persist.
   * @returns A promise that resolves after the write succeeds.
   * @throws When AsyncStorage cannot be written.
   */
  async save(cache: IngredientCatalogCache): Promise<void> {
    await AsyncStorage.setItem(INGREDIENT_CATALOG_STORAGE_KEY, encodeIngredientCatalogCache(cache));
  },
};
