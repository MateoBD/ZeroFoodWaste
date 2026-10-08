/** The outcome recorded when a pantry item leaves the active pantry. */
export type PantryEventOutcome = "consumed" | "wasted";

/** A durable record used to measure food consumed and thrown away over time. */
export type PantryEvent = Readonly<{
  id: string;
  pantryItemId: string;
  itemName: string;
  outcome: PantryEventOutcome;
  occurredAt: string;
}>;
