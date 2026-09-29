import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IngredientCatalogEntry } from './ingredient';

export type IngredientCatalogCache = Readonly<{
  fetchedAt: string;
  items: IngredientCatalogEntry[];
}>;

type StoredIngredientCatalog = {
  version: 1;
  fetchedAt: string;
  items: IngredientCatalogEntry[];
};

export const INGREDIENT_CATALOG_STORAGE_KEY = 'zerofoodwaste.themealdb-ingredients.v1';
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

export function encodeIngredientCatalogCache(cache: IngredientCatalogCache): string {
  const stored: StoredIngredientCatalog = { version: 1, ...cache };
  return JSON.stringify(stored);
}

export const asyncStorageIngredientCatalog = {
  async load(): Promise<IngredientCatalogCache | null> {
    return parseIngredientCatalogCache(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY));
  },
  async save(cache: IngredientCatalogCache): Promise<void> {
    await AsyncStorage.setItem(INGREDIENT_CATALOG_STORAGE_KEY, encodeIngredientCatalogCache(cache));
  },
};
