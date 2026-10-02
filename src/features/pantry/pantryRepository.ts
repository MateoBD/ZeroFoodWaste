import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PantryItem } from './pantryItem';
import { encodeStoredPantry, parseStoredPantry } from './pantryStorageCodec';

/**
 * Defines the storage boundary used by the pantry UI.
 *
 * Implementations reject load or save operations when storage fails.
 */
export type PantryRepository = {
  /**
   * Loads and validates every stored pantry item.
   *
   * @returns The stored pantry items, or an empty array when storage is empty.
   * @throws When storage cannot be read or the stored document is invalid.
   */
  loadItems: () => Promise<PantryItem[]>;
  /**
   * Replaces the stored pantry document with the supplied items.
   *
   * @param items - The complete pantry state to persist.
   * @returns A promise that resolves after the write succeeds.
   * @throws When the items cannot be written to storage.
   */
  saveItems: (items: readonly PantryItem[]) => Promise<void>;
};

/**
 * Identifies the versioned, device-local pantry document in AsyncStorage.
 */
export const PANTRY_STORAGE_KEY = 'zerofoodwaste.pantry.v1';

/**
 * Stores the pantry as versioned JSON in device-local AsyncStorage.
 *
 * Load and save operations reject when AsyncStorage fails. Loading also rejects
 * when the stored document cannot be decoded safely.
 */
export const asyncStoragePantryRepository: PantryRepository = {
  async loadItems() {
    return parseStoredPantry(await AsyncStorage.getItem(PANTRY_STORAGE_KEY));
  },
  async saveItems(items) {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, encodeStoredPantry(items));
  },
};
