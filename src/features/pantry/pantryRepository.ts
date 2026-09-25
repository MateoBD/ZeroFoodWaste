import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PantryItem } from './pantryItem';
import { encodeStoredPantry, parseStoredPantry } from './pantryStorageCodec';

// Device-local storage boundary. The pantry UI depends only on this type, so
// the storage engine can later change (for example to SQLite or a synced
// account) without rewriting screens.
export type PantryRepository = {
  loadItems: () => Promise<PantryItem[]>;
  saveItems: (items: readonly PantryItem[]) => Promise<void>;
};

export const PANTRY_STORAGE_KEY = 'zerofoodwaste.pantry.v1';

export const asyncStoragePantryRepository: PantryRepository = {
  async loadItems() {
    return parseStoredPantry(await AsyncStorage.getItem(PANTRY_STORAGE_KEY));
  },
  async saveItems(items) {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, encodeStoredPantry(items));
  },
};
