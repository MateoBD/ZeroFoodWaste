import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PantryEvent } from "./pantryEvent";
import {
  encodeStoredPantryEvents,
  parseStoredPantryEvents,
} from "./pantryEventStorageCodec";

/** Defines the storage boundary for the pantry outcome history. */
export type PantryEventRepository = {
  /**
   * Loads and validates every stored pantry outcome event.
   *
   * @return {Promise<PantryEvent[]>} The stored events, or an empty array when storage is empty.
   */
  loadEvents: () => Promise<PantryEvent[]>;
  /**
   * Replaces the stored pantry outcome document with the supplied event history.
   *
   * @param events - The complete outcome history to persist.
   * @return {Promise<void>} A promise that resolves after the write succeeds.
   */
  saveEvents: (events: readonly PantryEvent[]) => Promise<void>;
};

/** Identifies the versioned, device-local pantry event document. */
export const PANTRY_EVENT_STORAGE_KEY = "zerofoodwaste.pantry-events.v1";

/** Stores consumed and wasted outcomes in device-local AsyncStorage. */
export const asyncStoragePantryEventRepository: PantryEventRepository = {
  /**
   * Loads and validates the complete device-local pantry outcome history.
   *
   * @return {Promise<PantryEvent[]>} A promise resolving to stored events, or an empty history.
   */
  async loadEvents() {
    return parseStoredPantryEvents(
      await AsyncStorage.getItem(PANTRY_EVENT_STORAGE_KEY),
    );
  },
  /**
   * Replaces the device-local pantry outcome history with the supplied events.
   *
   * @param events - The complete outcome history to serialize and persist.
   * @return {Promise<void>} A promise resolving after the AsyncStorage write succeeds.
   */
  async saveEvents(events) {
    await AsyncStorage.setItem(
      PANTRY_EVENT_STORAGE_KEY,
      encodeStoredPantryEvents(events),
    );
  },
};
