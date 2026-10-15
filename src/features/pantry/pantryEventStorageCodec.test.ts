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
