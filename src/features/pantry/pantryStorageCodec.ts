import { isValidCalendarDate } from './calendarDate';
import type { PantryItem } from './pantryItem';

type StoredPantry = { version: 2; items: PantryItem[] };

function isIngredientReference(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reference = value as Record<string, unknown>;
  return (
    reference.provider === 'themealdb' &&
    typeof reference.id === 'string' && reference.id.trim().length > 0 &&
    typeof reference.name === 'string' && reference.name.trim().length > 0
  );
}

function isPantryItem(value: unknown, hasRecipeIngredient: boolean): value is PantryItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    (!hasRecipeIngredient || item.recipeIngredient === null || isIngredientReference(item.recipeIngredient)) &&
    typeof item.expirationDate === 'string' && isValidCalendarDate(item.expirationDate) &&
    typeof item.createdAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.createdAt) &&
    isCanonicalTimestamp(item.createdAt)
  );
}

function isCanonicalTimestamp(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

// Invalid stored data must remain on disk for recovery; callers surface the error.
export function parseStoredPantry(raw: string | null): PantryItem[] {
  if (raw === null) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Pantry storage contains malformed JSON');
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Pantry storage has an invalid format');
  }

  const stored = data as Record<string, unknown>;
  if ((stored.version !== 1 && stored.version !== 2) || !Array.isArray(stored.items)) {
    throw new Error('Pantry storage has an unsupported format');
  }

  const ids = new Set<string>();
  for (const item of stored.items) {
    if (!isPantryItem(item, stored.version === 2) || ids.has(item.id)) {
      throw new Error('Pantry storage contains an invalid item');
    }
    ids.add(item.id);
  }

  return stored.items.map((item) =>
    stored.version === 1 ? { ...item, recipeIngredient: null } : item,
  ) as PantryItem[];
}

export function encodeStoredPantry(items: readonly PantryItem[]): string {
  const data: StoredPantry = { version: 2, items: [...items] };
  return JSON.stringify(data);
}
