import AsyncStorage from '@react-native-async-storage/async-storage';

import { PANTRY_EVENT_STORAGE_KEY } from './pantryEventRepository';
import {
  encodeStoredPantryDocument,
  parseStoredPantryDocument,
  type PantryDocument,
} from './pantryStorageCodec';

/**
 * Defines the storage boundary used by the pantry UI.
 *
 * Implementations reject load or save operations when storage fails.
 */
export type PantryRepository = {
  /**
   * Loads and validates the active pantry and outcome history.
   *
   * @returns The stored document, with empty item and event arrays when storage is empty.
   * @throws When storage cannot be read or the stored document is invalid.
   */
  load: () => Promise<PantryDocument>;
  /**
   * Replaces the stored pantry document with one coherent state snapshot.
   *
   * @param document - The complete active pantry and outcome history to persist.
   * @returns A promise that resolves after the write succeeds.
   * @throws When the items cannot be written to storage.
   */
  save: (document: PantryDocument) => Promise<void>;
};

/**
 * Identifies the versioned, device-local pantry document in AsyncStorage.
 */
export const PANTRY_STORAGE_KEY = 'zerofoodwaste.pantry.v1';

/**
 * Stores pantry items and history as one versioned JSON value in AsyncStorage.
 *
 * Load and save operations reject when AsyncStorage fails. Loading also rejects
 * when the stored document cannot be decoded safely.
 */
export const asyncStoragePantryRepository: PantryRepository = {
  async load() {
    const [pantryRaw, legacyEventsRaw] = await Promise.all([
      AsyncStorage.getItem(PANTRY_STORAGE_KEY),
      AsyncStorage.getItem(PANTRY_EVENT_STORAGE_KEY),
    ]);
    return parseStoredPantryDocument(pantryRaw, legacyEventsRaw);
  },
  async save(document) {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, encodeStoredPantryDocument(document));
  },
};
