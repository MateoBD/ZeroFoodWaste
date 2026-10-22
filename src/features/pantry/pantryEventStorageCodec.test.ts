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
  amount: 2,
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
    const { amount: _amount, ...legacyEvent } = consumedEvent;
    const event = { ...legacyEvent, itemSnapshot: oldSnapshot };
    expect(parseStoredPantryEvents(JSON.stringify({ version: 2, events: [event] }))).toEqual([
      { ...event, amount: 1, itemSnapshot: { ...oldSnapshot, quantity: 1 } },
    ]);
  });

  it("uses a legacy version 3 snapshot quantity as the migrated event amount", () => {
    const { amount: _amount, ...legacyEvent } = consumedEvent;
    const event = { ...legacyEvent, itemSnapshot: { ...oldSnapshot, quantity: 4 } };
    expect(parseStoredPantryEvents(JSON.stringify({ version: 3, events: [event] }))).toEqual([
      { ...event, amount: 4 },
    ]);
    for (const quantity of [0, -1, 1.5, "2", undefined]) {
      expect(() => parseStoredPantryEvents(JSON.stringify({
        version: 3, events: [{ ...event, itemSnapshot: { ...oldSnapshot, quantity } }],
      }))).toThrow();
    }
  });

  it.each([0, -1, 1.5, "2", undefined])("rejects an invalid version 4 amount (%s)", (amount) => {
    expect(() => parseStoredPantryEvents(JSON.stringify({
      version: 4,
      events: [{ ...consumedEvent, amount }],
    }))).toThrow();
  });

  it("repairs event IDs duplicated by older app sessions", () => {
    const duplicate = { ...consumedEvent, itemName: "Toast" };

    expect(
      parseStoredPantryEvents(
        encodeStoredPantryEvents([consumedEvent, duplicate]),
      ),
    ).toEqual([
      consumedEvent,
      { ...duplicate, id: "event-1-migrated-2" },
    ]);
  });

  it("rejects invalid outcomes", () => {
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
