import { isValidCalendarDate } from './calendarDate';
import type { PantryItem } from './pantryItem';

type StoredPantry = { version: 1; items: PantryItem[] };

function isPantryItem(value: unknown): value is PantryItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
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
  if (stored.version !== 1 || !Array.isArray(stored.items)) {
    throw new Error('Pantry storage has an unsupported format');
  }

  const ids = new Set<string>();
  for (const item of stored.items) {
    if (!isPantryItem(item) || ids.has(item.id)) {
      throw new Error('Pantry storage contains an invalid item');
    }
    ids.add(item.id);
  }

  return stored.items as PantryItem[];
}

export function encodeStoredPantry(items: readonly PantryItem[]): string {
  const data: StoredPantry = { version: 1, items: [...items] };
  return JSON.stringify(data);
}
