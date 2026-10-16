import {
  encodeStoredPantryEvents,
  parseStoredPantryEvents,
} from "./pantryEventStorageCodec";
import type { PantryEvent } from "./pantryEvent";

const consumedEvent: PantryEvent = {
  id: "event-1",
  pantryItemId: "bread",
  itemName: "Bread",
  outcome: "consumed",
  occurredAt: "2026-10-06T09:00:00.000Z",
};

const oldSnapshot = {
  id: "bread", name: "Bread", recipeIngredient: null,
  expirationDate: "2026-10-15", createdAt: "2026-09-01T10:00:00.000Z",
};

describe("pantry event storage codec", () => {
  it("round-trips consumed and wasted outcomes in a versioned document", () => {
    const events = [
      consumedEvent,
      { ...consumedEvent, id: "event-2", outcome: "wasted" as const },
    ];

    expect(parseStoredPantryEvents(encodeStoredPantryEvents(events))).toEqual(
      events,
    );
  });

  it("treats a missing document as an empty history", () => {
    expect(parseStoredPantryEvents(null)).toEqual([]);
  });

  it("adds one unit to an old restorable snapshot", () => {
    const event = { ...consumedEvent, itemSnapshot: oldSnapshot };
    expect(parseStoredPantryEvents(JSON.stringify({ version: 2, events: [event] }))).toEqual([
      { ...event, itemSnapshot: { ...oldSnapshot, quantity: 1 } },
    ]);
  });

  it("retains a version 3 snapshot quantity and rejects invalid quantities", () => {
    const event = { ...consumedEvent, itemSnapshot: { ...oldSnapshot, quantity: 4 } };
    expect(parseStoredPantryEvents(JSON.stringify({ version: 3, events: [event] }))).toEqual([event]);
    for (const quantity of [0, -1, 1.5, "2", undefined]) {
      expect(() => parseStoredPantryEvents(JSON.stringify({
        version: 3, events: [{ ...event, itemSnapshot: { ...oldSnapshot, quantity } }],
      }))).toThrow();
    }
  });

  it("rejects duplicate event IDs and invalid outcomes", () => {
    expect(() =>
      parseStoredPantryEvents(
        encodeStoredPantryEvents([consumedEvent, consumedEvent]),
      ),
    ).toThrow();
    expect(() =>
      parseStoredPantryEvents(
        JSON.stringify({
          version: 1,
          events: [{ ...consumedEvent, outcome: "discarded" }],
        }),
      ),
    ).toThrow();
  });
});
