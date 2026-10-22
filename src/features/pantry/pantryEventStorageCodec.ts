import type { PantryEvent } from "./pantryEvent";
import { isValidPantryQuantity, type PantryItem } from "./pantryItem";
import { isValidCalendarDate } from "./calendarDate";

type StoredPantryEvents = { version: 3; events: PantryEvent[] };

/**
 * Validates that an unknown value is a complete TheMealDB ingredient reference
 * suitable for inclusion in a restorable pantry-item snapshot.
 *
 * @param value - The unknown value read from persisted event storage.
 * @return {boolean} Whether the value contains the expected provider, ID, and name.
 */
function isIngredientReference(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const reference = value as Record<string, unknown>;
  return (
    reference.provider === "themealdb" &&
    typeof reference.id === "string" &&
    reference.id.trim().length > 0 &&
    typeof reference.name === "string" &&
    reference.name.trim().length > 0
  );
}

/**
 * Validates the complete pantry-item snapshot stored inside a restorable event,
 * including its identity, package date, optional recipe reference, and timestamp.
 * Version 3 also requires a positive whole-unit quantity.
 *
 * @param value - The unknown snapshot value read from persisted event storage.
 * @param hasQuantity - Whether its version requires quantity.
 * @return {boolean} Whether the value is a valid pantry item that can be restored.
 */
function isPantryItem(value: unknown, hasQuantity: boolean): value is PantryItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    (!hasQuantity || isValidPantryQuantity(item.quantity)) &&
    (item.recipeIngredient === null || isIngredientReference(item.recipeIngredient)) &&
    typeof item.expirationDate === "string" &&
    isValidCalendarDate(item.expirationDate) &&
    typeof item.createdAt === "string" &&
    isCanonicalTimestamp(item.createdAt)
  );
}

/**
 * Checks whether a stored timestamp is a real ISO timestamp in canonical form,
 * preventing malformed event dates from affecting dashboard calculations.
 *
 * @param value - The unknown timestamp value read from persisted storage.
 * @return {value is string} Whether the value is a canonical ISO timestamp string.
 */
function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Preserves valid history created across app sessions whose action counter
 * restarted from one by assigning deterministic IDs to later collisions.
 *
 * @param id - The stored event ID.
 * @param usedIds - IDs already claimed while decoding the document.
 * @return {string} The original ID or a collision-free migrated ID.
 */
function claimEventId(id: string, usedIds: Set<string>): string {
  if (!usedIds.has(id)) {
    usedIds.add(id);
    return id;
  }

  let suffix = 2;
  let candidate = `${id}-migrated-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${id}-migrated-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

/**
 * Validates an event's required history fields and, for version-two data,
 * validates any optional pantry snapshot used by the permanent restore action.
 *
 * @param value - The unknown event value read from persisted storage.
 * @param version - The enclosing storage version.
 * @return {value is PantryEvent} Whether the value is a valid pantry event.
 */
function isPantryEvent(value: unknown, version: number): value is PantryEvent {
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
    isCanonicalTimestamp(event.occurredAt) &&
    (event.itemSnapshot === undefined ||
      (version >= 2 && isPantryItem(event.itemSnapshot, version >= 3)))
  );
}

/**
 * Decodes the device-local pantry event document.
 *
 * A missing document means that the app has no recorded outcomes yet. Invalid
 * data is rejected so a damaged history is never shown as trustworthy metrics.
 *
 * @param raw - Stored JSON, or null when no events have been saved.
 * @return {PantryEvent[]} Valid pantry events in their stored order. Version 1 events remain
 * readable but do not contain enough data to restore the original item. Version 2
 * snapshots receive one unit when loaded.
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
  if ((stored.version !== 1 && stored.version !== 2 && stored.version !== 3) || !Array.isArray(stored.events)) {
    throw new Error("Pantry event storage has an unsupported format");
  }

  for (const event of stored.events) {
    if (!isPantryEvent(event, stored.version)) {
      throw new Error("Pantry event storage contains an invalid event");
    }
  }

  const ids = new Set<string>();
  return stored.events.map((event: PantryEvent) => {
    const migratedEvent = { ...event, id: claimEventId(event.id, ids) };
    return stored.version === 2 && event.itemSnapshot
      ? { ...migratedEvent, itemSnapshot: { ...event.itemSnapshot, quantity: 1 } }
      : migratedEvent;
  });
}

/**
 * Serializes pantry outcome events as a versioned device-local document.
 *
 * @param events - The complete event history to persist.
 * @return {string} The version 3 event document serialized as JSON.
 */
export function encodeStoredPantryEvents(
  events: readonly PantryEvent[],
): string {
  const data: StoredPantryEvents = { version: 3, events: [...events] };
  return JSON.stringify(data);
}
