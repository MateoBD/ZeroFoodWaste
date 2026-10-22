import { isValidCalendarDate } from './calendarDate';
import { isValidPantryQuantity, type PantryItem } from './pantryItem';
import type { PantryEvent } from './pantryEvent';
import { encodeStoredPantryEvents, parseStoredPantryEvents } from './pantryEventStorageCodec';

type StoredPantry = { version: 3; items: PantryItem[] };
type StoredPantryDocument = { version: 4; items: PantryItem[]; events: PantryEvent[] };

/** Active pantry items and outcome history persisted as one coherent snapshot. */
export type PantryDocument = Readonly<{
  items: PantryItem[];
  events: PantryEvent[];
}>;

/**
 * Checks whether stored data is a complete TheMealDB ingredient reference.
 *
 * @param value - The unknown stored value to inspect.
 * @returns Whether the value has a provider, non-empty ID, and non-empty name.
 */
function isIngredientReference(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reference = value as Record<string, unknown>;
  return (
    reference.provider === 'themealdb' &&
    typeof reference.id === 'string' && reference.id.trim().length > 0 &&
    typeof reference.name === 'string' && reference.name.trim().length > 0
  );
}

/**
 * Checks whether stored data is a valid pantry item for its document version.
 *
 * Version 1 records do not contain recipe ingredient references.
 *
 * @param value - The unknown stored item to inspect.
 * @param version - The storage version containing the item.
 * @returns Whether the value is a valid pantry item.
 */
function isPantryItem(value: unknown, version: number): value is PantryItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const hasRecipeIngredient = version >= 2;
  const hasQuantity = version >= 3;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    (!hasRecipeIngredient || item.recipeIngredient === null || isIngredientReference(item.recipeIngredient)) &&
    typeof item.expirationDate === 'string' && isValidCalendarDate(item.expirationDate) &&
    (!hasQuantity || isValidPantryQuantity(item.quantity)) &&
    typeof item.createdAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.createdAt) &&
    isCanonicalTimestamp(item.createdAt)
  );
}

/**
 * Checks whether a timestamp round-trips to its canonical ISO spelling.
 *
 * @param value - The timestamp string to inspect.
 * @returns Whether the value is a real canonical ISO timestamp.
 */
function isCanonicalTimestamp(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Reads v1 through v3 pantry documents and supplies missing legacy fields.
 *
 * A missing document yields an empty pantry. Invalid data stays on disk for recovery.
 *
 * @param raw - Stored JSON, or null when no pantry has been saved.
 * @returns Valid pantry items, migrated in memory to the current shape.
 * @throws Error when JSON, version, item data, or item IDs are invalid.
 */
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
  const version = stored.version;
  if ((version !== 1 && version !== 2 && version !== 3) || !Array.isArray(stored.items)) {
    throw new Error('Pantry storage has an unsupported format');
  }

  const ids = new Set<string>();
  for (const item of stored.items) {
    if (!isPantryItem(item, version) || ids.has(item.id)) {
      throw new Error('Pantry storage contains an invalid item');
    }
    ids.add(item.id);
  }

  return stored.items.map((item) => ({
    ...item,
    recipeIngredient: version === 1 ? null : item.recipeIngredient,
    quantity: version === 3 ? item.quantity : 1,
  })) as PantryItem[];
}

/**
 * Serializes pantry items as a version 3 storage document.
 *
 * @param items - The pantry items to store.
 * @returns The versioned pantry document as JSON.
 */
export function encodeStoredPantry(items: readonly PantryItem[]): string {
  const data: StoredPantry = { version: 3, items: [...items] };
  return JSON.stringify(data);
}

/**
 * Reads the current combined document or migrates the two legacy documents.
 *
 * @param pantryRaw - The active pantry document stored under the pantry key.
 * @param legacyEventsRaw - The former standalone outcome-history document.
 * @returns The validated current pantry and history state.
 * @throws Error when either required stored document is malformed or unsupported.
 */
export function parseStoredPantryDocument(
  pantryRaw: string | null,
  legacyEventsRaw: string | null,
): PantryDocument {
  if (pantryRaw !== null) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(pantryRaw);
    } catch {
      return { items: parseStoredPantry(pantryRaw), events: [] };
    }
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
      const stored = candidate as Record<string, unknown>;
      if (stored.version === 4 && Array.isArray(stored.items) && Array.isArray(stored.events)) {
        return {
          items: parseStoredPantry(JSON.stringify({ version: 3, items: stored.items })),
          events: parseStoredPantryEvents(encodeStoredPantryEvents(stored.events as PantryEvent[])),
        };
      }
    }
  }

  return {
    items: parseStoredPantry(pantryRaw),
    events: parseStoredPantryEvents(legacyEventsRaw),
  };
}

/**
 * Serializes active pantry items and history in one versioned document.
 *
 * @param document - The complete device-local pantry state.
 * @returns The version 4 document serialized as JSON.
 */
export function encodeStoredPantryDocument(document: PantryDocument): string {
  const stored: StoredPantryDocument = {
    version: 4,
    items: [...document.items],
    events: [...document.events],
  };
  return JSON.stringify(stored);
}
