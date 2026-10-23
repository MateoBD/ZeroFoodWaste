/**
 * Identifies the former standalone history document used only during migration.
 *
 * Current writes store items and events together under `PANTRY_STORAGE_KEY`.
 */
export const PANTRY_EVENT_STORAGE_KEY = "zerofoodwaste.pantry-events.v1";
