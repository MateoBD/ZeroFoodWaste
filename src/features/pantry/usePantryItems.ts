import { useEffect, useRef, useState } from 'react';

import { createPantryItem, type PantryItem } from './pantryItem';
import { asyncStoragePantryRepository, type PantryRepository } from './pantryRepository';
import type { IngredientReference } from '@/features/recipes/ingredient';
import { compactPantryActions, replayPantryActions, type PantryAction } from './pantryActionJournal';

/**
 * Represents the load state of the device-local pantry.
 */
export type PantryLoadStatus = 'loading' | 'ready' | 'error';

/**
 * Contains the editable fields accepted when adding or updating a pantry item.
 */
export type PantryItemDraft = Readonly<{
  name: string;
  expirationDate: string;
  recipeIngredient: IngredientReference | null;
}>;

/**
 * Loads pantry items and queues writes in order after local pantry actions.
 *
 * Pending edits and consumption can be undone without overwriting later actions.
 * A load failure blocks edits; a failed save leaves the local item visible and sets hasSaveError.
 *
 * @param repository - The pantry storage implementation. Defaults to AsyncStorage.
 * @returns Pantry data, state flags, and actions for loading, changing, and undoing items.
 */
export function usePantryItems(repository: PantryRepository = asyncStoragePantryRepository) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<PantryLoadStatus>('loading');
  const [hasSaveError, setHasSaveError] = useState(false);
  const [failedActionIds, setFailedActionIds] = useState<string[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const itemsRef = useRef<PantryItem[]>([]);
  const statusRef = useRef<PantryLoadStatus>('loading');
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const baseRef = useRef<PantryItem[]>([]);
  const actionsRef = useRef<PantryAction[]>([]);
  const actionSequence = useRef(0);

  function saveItems(nextItems: PantryItem[], actionId: string) {
    itemsRef.current = nextItems;
    setItems(nextItems);
    writeQueue.current = writeQueue.current
      .then(() => repository.saveItems(nextItems))
      .then(
        () => {
          setHasSaveError(false);
          setFailedActionIds([]);
        },
        () => {
          setHasSaveError(true);
          setFailedActionIds((ids) => [...ids, actionId]);
        },
      );
  }

  function nextActionId() {
    actionSequence.current += 1;
    return `pantry-action-${actionSequence.current}`;
  }

  function compactActions() {
    const compacted = compactPantryActions(baseRef.current, actionsRef.current);
    baseRef.current = compacted.base;
    actionsRef.current = compacted.actions;
  }

  useEffect(() => {
    let isActive = true;

    repository.loadItems().then(
      (loadedItems) => {
        if (isActive) {
          itemsRef.current = loadedItems;
          baseRef.current = loadedItems;
          actionsRef.current = [];
          setItems(loadedItems);
          statusRef.current = 'ready';
          setStatus('ready');
        }
      },
      () => {
        if (isActive) {
          statusRef.current = 'error';
          setStatus('error');
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [repository, loadAttempt]);

  function retryLoad() {
    statusRef.current = 'loading';
    setStatus('loading');
    setLoadAttempt((attempt) => attempt + 1);
  }

  // Adding is only offered once loading succeeds, so a save never overwrites
  // stored items that have not been read yet.
  function addItem(draft: PantryItemDraft) {
    if (statusRef.current !== 'ready') return;
    const action: PantryAction = {
      id: nextActionId(), kind: 'add',
      item: createPantryItem(draft.name, draft.expirationDate, draft.recipeIngredient),
      undoable: false,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveItems(replayPantryActions(baseRef.current, actionsRef.current), action.id);
    compactActions();
  }

  function updateItem(id: string, draft: PantryItemDraft) {
    if (statusRef.current !== 'ready') return null;
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return null;
    const reference = item.recipeIngredient;
    const newReference = draft.recipeIngredient;
    if (item.name === draft.name && item.expirationDate === draft.expirationDate &&
      reference?.provider === newReference?.provider && reference?.id === newReference?.id &&
      reference?.name === newReference?.name) return null;

    const action: PantryAction = {
      id: nextActionId(), kind: 'edit', itemId: id,
      changes: {
        ...(item.name !== draft.name ? { name: draft.name } : {}),
        ...(item.expirationDate !== draft.expirationDate ? { expirationDate: draft.expirationDate } : {}),
        ...(reference?.provider !== newReference?.provider || reference?.id !== newReference?.id ||
          reference?.name !== newReference?.name ? { recipeIngredient: newReference } : {}),
      },
      undoable: true,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveItems(replayPantryActions(baseRef.current, actionsRef.current), action.id);
    return action.id;
  }

  function consumeItem(id: string) {
    if (statusRef.current !== 'ready' || !itemsRef.current.some((item) => item.id === id)) return null;
    const action: PantryAction = { id: nextActionId(), kind: 'consume', itemId: id, undoable: true };
    actionsRef.current = [...actionsRef.current, action];
    saveItems(replayPantryActions(baseRef.current, actionsRef.current), action.id);
    return action.id;
  }

  function undoAction(id: string) {
    if (!actionsRef.current.some((action) => action.id === id && action.undoable)) return false;
    actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
    saveItems(replayPantryActions(baseRef.current, actionsRef.current), nextActionId());
    compactActions();
    return true;
  }

  function finalizeAction(id: string) {
    actionsRef.current = actionsRef.current.map((action) =>
      action.id === id ? { ...action, undoable: false } : action,
    );
    compactActions();
  }

  return {
    items, status, hasSaveError, failedActionIds, addItem, updateItem,
    consumeItem, undoAction, finalizeAction, retryLoad,
  };
}
