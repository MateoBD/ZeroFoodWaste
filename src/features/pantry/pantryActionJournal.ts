import type { PantryItem } from './pantryItem';
import type { PantryItemDraft } from './usePantryItems';

/** A pantry change retained while an Undo window may still be open. */
export type PantryAction =
  | { id: string; kind: 'add'; item: PantryItem; undoable: false }
  | { id: string; kind: 'edit'; itemId: string; changes: Partial<PantryItemDraft>; undoable: boolean }
  | { id: string; kind: 'consume'; itemId: string; undoable: boolean };

/**
 * Applies pantry changes in order, preserving item identity and list order.
 *
 * Replaying after an Undo keeps later changes intact, even when they affect the
 * same item. An edit of an item already consumed has no effect.
 *
 * @param base - Pantry state before the retained actions.
 * @param actions - Actions to apply in chronological order.
 * @returns The resulting active pantry items.
 */
export function replayPantryActions(base: readonly PantryItem[], actions: readonly PantryAction[]): PantryItem[] {
  return actions.reduce<PantryItem[]>((items, action) => {
    if (action.kind === 'add') return [...items, action.item];
    if (action.kind === 'consume') return items.filter((item) => item.id !== action.itemId);
    return items.map((item) => item.id === action.itemId ? { ...item, ...action.changes } : item);
  }, [...base]);
}

/**
 * Moves finalized actions at the front of the journal into the base state.
 *
 * @param base - State before the retained actions.
 * @param actions - Chronological actions, including any awaiting Undo.
 * @returns A compacted base and the actions still needed for Undo.
 */
export function compactPantryActions(base: readonly PantryItem[], actions: readonly PantryAction[]) {
  const firstPending = actions.findIndex((action) => action.undoable);
  const compactCount = firstPending < 0 ? actions.length : firstPending;
  return {
    base: replayPantryActions(base, actions.slice(0, compactCount)),
    actions: actions.slice(compactCount),
  };
}
