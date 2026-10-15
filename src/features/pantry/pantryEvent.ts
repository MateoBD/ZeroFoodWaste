import type { PantryItem } from './pantryItem';

/** The outcome recorded when a pantry item leaves the active pantry. */
export type PantryEventOutcome = "consumed" | "wasted";

/** A durable record used to measure food consumed and thrown away over time. */
export type PantryEvent = Readonly<{
  id: string;
  pantryItemId: string;
  itemName: string;
  outcome: PantryEventOutcome;
  occurredAt: string;
  /**
   * The item before it left the pantry. Older events do not have this field
   * and can therefore be viewed but not restored.
   */
  itemSnapshot?: PantryItem;
}>;
