import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PantryEvent } from "./pantryEvent";
import {
  encodeStoredPantryEvents,
  parseStoredPantryEvents,
} from "./pantryEventStorageCodec";

/** Defines the storage boundary for the pantry outcome history. */
export type PantryEventRepository = {
  loadEvents: () => Promise<PantryEvent[]>;
  saveEvents: (events: readonly PantryEvent[]) => Promise<void>;
};

/** Identifies the versioned, device-local pantry event document. */
export const PANTRY_EVENT_STORAGE_KEY = "zerofoodwaste.pantry-events.v1";

/** Stores consumed and wasted outcomes in device-local AsyncStorage. */
export const asyncStoragePantryEventRepository: PantryEventRepository = {
  async loadEvents() {
    return parseStoredPantryEvents(
      await AsyncStorage.getItem(PANTRY_EVENT_STORAGE_KEY),
    );
  },
  async saveEvents(events) {
    await AsyncStorage.setItem(
      PANTRY_EVENT_STORAGE_KEY,
      encodeStoredPantryEvents(events),
    );
  },
};
