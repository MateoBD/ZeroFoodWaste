import type { PantryEvent } from "./pantryEvent";

type StoredPantryEvents = { version: 1; events: PantryEvent[] };

function isCanonicalTimestamp(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isPantryEvent(value: unknown): value is PantryEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    event.id.trim().length > 0 &&
    typeof event.pantryItemId === "string" &&
    event.pantryItemId.trim().length > 0 &&
    typeof event.itemName === "string" &&
    event.itemName.trim().length > 0 &&
    (event.outcome === "consumed" || event.outcome === "wasted") &&
    typeof event.occurredAt === "string" &&
    isCanonicalTimestamp(event.occurredAt)
  );
}

/**
 * Decodes the device-local pantry event document.
 *
 * A missing document means that the app has no recorded outcomes yet. Invalid
 * data is rejected so a damaged history is never shown as trustworthy metrics.
 *
 * @param raw - Stored JSON, or null when no events have been saved.
 * @returns Valid pantry events in their stored order.
 * @throws Error when the stored document is malformed or unsupported.
 */
export function parseStoredPantryEvents(raw: string | null): PantryEvent[] {
  if (raw === null) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Pantry event storage contains malformed JSON");
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Pantry event storage has an invalid format");
  }

  const stored = data as Record<string, unknown>;
  if (stored.version !== 1 || !Array.isArray(stored.events)) {
    throw new Error("Pantry event storage has an unsupported format");
  }

  const ids = new Set<string>();
  for (const event of stored.events) {
    if (!isPantryEvent(event) || ids.has(event.id)) {
      throw new Error("Pantry event storage contains an invalid event");
    }
    ids.add(event.id);
  }

  return stored.events;
}

/**
 * Serializes pantry outcome events as a versioned device-local document.
 *
 * @param events - The complete event history to persist.
 * @returns The versioned event document as JSON.
 */
export function encodeStoredPantryEvents(
  events: readonly PantryEvent[],
): string {
  const data: StoredPantryEvents = { version: 1, events: [...events] };
  return JSON.stringify(data);
}
