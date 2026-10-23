import { compactPantryActions, replayPantryActions, type PantryAction } from './pantryActionJournal';
import type { PantryItem } from './pantryItem';

const bread: PantryItem = {
  id: 'bread', name: 'Bread', expirationDate: '2999-10-10',
  recipeIngredient: null, createdAt: '2026-09-01T10:00:00.000Z', quantity: 1,
};
const milk: PantryItem = {
  id: 'milk', name: 'Milk', expirationDate: '2999-10-11',
  recipeIngredient: null, createdAt: '2026-09-01T10:00:00.000Z', quantity: 1,
};

describe('pantry action journal', () => {
  it('replays later changes after undoing an earlier edit', () => {
    const actions: PantryAction[] = [
      { id: 'a', kind: 'edit', itemId: 'bread', changes: { name: 'Sourdough' }, quantityDelta: 0, undoable: true },
      { id: 'b', kind: 'edit', itemId: 'bread', changes: { expirationDate: '2999-10-20' }, quantityDelta: 0, undoable: true },
      { id: 'c', kind: 'consume', itemId: 'milk', amount: 1, undoable: true },
    ];

    expect(replayPantryActions([bread, milk], actions.filter((action) => action.id !== 'a'))).toEqual([
      { ...bread, expirationDate: '2999-10-20' },
    ]);
    expect(replayPantryActions([bread, milk], actions.filter((action) => action.id !== 'c'))).toEqual([
      { ...bread, name: 'Sourdough', expirationDate: '2999-10-20' }, milk,
    ]);
  });

  it('restores the original position when consumption is undone', () => {
    const actions: PantryAction[] = [
      { id: 'a', kind: 'consume', itemId: 'bread', amount: 1, undoable: true },
      { id: 'b', kind: 'add', item: { ...bread, id: 'banana', name: 'Banana' }, undoable: false },
    ];

    expect(replayPantryActions([bread, milk], actions.filter((action) => action.id !== 'a'))
      .map((item) => item.id)).toEqual(['bread', 'milk', 'banana']);
  });

  it('compacts finalized actions without losing a later Undo window', () => {
    const actions: PantryAction[] = [
      { id: 'a', kind: 'edit', itemId: 'bread', changes: { name: 'Sourdough' }, quantityDelta: 0, undoable: false },
      { id: 'b', kind: 'add', item: milk, undoable: false },
      { id: 'c', kind: 'consume', itemId: 'bread', amount: 1, undoable: true },
    ];

    expect(compactPantryActions([bread], actions)).toEqual({
      base: [{ ...bread, name: 'Sourdough' }, milk],
      actions: [actions[2]],
    });
  });

  it('undoes only one partial outcome while preserving later quantity changes', () => {
    const pantryBread = { ...bread, quantity: 5 };
    const actions: PantryAction[] = [
      { id: 'a', kind: 'consume', itemId: 'bread', amount: 2, undoable: true },
      { id: 'b', kind: 'consume', itemId: 'bread', amount: 1, undoable: true },
    ];
    expect(replayPantryActions([pantryBread], actions)).toEqual([{ ...pantryBread, quantity: 2 }]);
    expect(replayPantryActions([pantryBread], actions.slice(1))).toEqual([{ ...pantryBread, quantity: 4 }]);
  });

  it('returns an undone event amount on top of a later typed correction', () => {
    const pantryBread = { ...bread, quantity: 5 };
    const actions: PantryAction[] = [
      { id: 'a', kind: 'consume', itemId: 'bread', amount: 2, undoable: true },
      { id: 'b', kind: 'edit', itemId: 'bread', changes: {}, quantityDelta: 7, undoable: true },
    ];

    expect(replayPantryActions([pantryBread], actions)).toEqual([{ ...pantryBread, quantity: 10 }]);
    expect(replayPantryActions([pantryBread], actions.slice(1))).toEqual([{ ...pantryBread, quantity: 12 }]);
  });

  it('restores only an event amount while preserving the current pantry fields', () => {
    const currentBread = { ...bread, name: 'Toast', quantity: 3 };
    const actions: PantryAction[] = [
      { id: 'restore', kind: 'restore', item: { ...bread, quantity: 5 }, amount: 2, undoable: false },
    ];

    expect(replayPantryActions([currentBread], actions)).toEqual([
      { ...currentBread, quantity: 5 },
    ]);
  });
});
