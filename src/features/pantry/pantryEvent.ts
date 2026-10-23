import type { PantryItem } from './pantryItem';

/** The outcome recorded when a pantry item leaves the active pantry. */
export type PantryEventOutcome = "consumed" | "wasted";

/** A durable record used to measure food consumed and thrown away over time. */
export type PantryEvent = Readonly<{
  id: string;
  pantryItemId: string;
  itemName: string;
  outcome: PantryEventOutcome;
  /** The whole-unit amount represented by this outcome. */
  amount: number;
  occurredAt: string;
  /**
   * The item immediately before this outcome changed its quantity. Older
   * events without a snapshot can be viewed but cannot be restored.
   */
  itemSnapshot?: PantryItem;
}>;
