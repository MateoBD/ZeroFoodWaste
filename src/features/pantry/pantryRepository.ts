import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PantryItem } from './pantryItem';

// Device-local storage boundary. The pantry UI depends only on this type, so
// the storage engine can later change (for example to SQLite or a synced
// account) without rewriting screens.
export type PantryRepository = {
  loadItems: () => Promise<PantryItem[]>;
  saveItems: (items: readonly PantryItem[]) => Promise<void>;
};

export const PANTRY_STORAGE_KEY = 'zerofoodwaste.pantry.v1';

type StoredPantry = {
  version: 1;
  items: PantryItem[];
};

function isPantryItem(value: unknown): value is PantryItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.expirationDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.expirationDate) &&
    typeof item.createdAt === 'string'
  );
}

// Unreadable or unrecognized data is treated as an empty pantry rather than
// crashing the app. Individually malformed items are skipped.
export function parseStoredPantry(raw: string | null): PantryItem[] {
  if (raw === null) {
    return [];
  }

  try {
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== 'object' ||
      data === null ||
      (data as StoredPantry).version !== 1 ||
      !Array.isArray((data as StoredPantry).items)
    ) {
      return [];
    }

    return (data as StoredPantry).items.filter(isPantryItem);
  } catch {
    return [];
  }
}

export const asyncStoragePantryRepository: PantryRepository = {
  async loadItems() {
    return parseStoredPantry(await AsyncStorage.getItem(PANTRY_STORAGE_KEY));
  },
  async saveItems(items) {
    const data: StoredPantry = { version: 1, items: [...items] };
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(data));
  },
};
