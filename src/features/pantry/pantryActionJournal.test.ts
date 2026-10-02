import { compactPantryActions, replayPantryActions, type PantryAction } from './pantryActionJournal';
import type { PantryItem } from './pantryItem';

const bread: PantryItem = {
  id: 'bread', name: 'Bread', expirationDate: '2999-10-10',
  recipeIngredient: null, createdAt: '2026-09-01T10:00:00.000Z',
};
const milk: PantryItem = {
  id: 'milk', name: 'Milk', expirationDate: '2999-10-11',
  recipeIngredient: null, createdAt: '2026-09-01T10:00:00.000Z',
};

describe('pantry action journal', () => {
  it('replays later changes after undoing an earlier edit', () => {
    const actions: PantryAction[] = [
      { id: 'a', kind: 'edit', itemId: 'bread', changes: { name: 'Sourdough' }, undoable: true },
      { id: 'b', kind: 'edit', itemId: 'bread', changes: { expirationDate: '2999-10-20' }, undoable: true },
      { id: 'c', kind: 'consume', itemId: 'milk', undoable: true },
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
      { id: 'a', kind: 'consume', itemId: 'bread', undoable: true },
      { id: 'b', kind: 'add', item: { ...bread, id: 'banana', name: 'Banana' }, undoable: false },
    ];

    expect(replayPantryActions([bread, milk], actions.filter((action) => action.id !== 'a'))
      .map((item) => item.id)).toEqual(['bread', 'milk', 'banana']);
  });

  it('compacts finalized actions without losing a later Undo window', () => {
    const actions: PantryAction[] = [
      { id: 'a', kind: 'edit', itemId: 'bread', changes: { name: 'Sourdough' }, undoable: false },
      { id: 'b', kind: 'add', item: milk, undoable: false },
      { id: 'c', kind: 'consume', itemId: 'bread', undoable: true },
    ];

    expect(compactPantryActions([bread], actions)).toEqual({
      base: [{ ...bread, name: 'Sourdough' }, milk],
      actions: [actions[2]],
    });
  });
});
