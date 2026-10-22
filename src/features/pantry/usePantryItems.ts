import { useEffect, useRef, useState } from 'react';

import { createPantryItem, isValidPantryQuantity, type PantryItem } from './pantryItem';
import { asyncStoragePantryRepository, type PantryRepository } from './pantryRepository';
import {
  asyncStoragePantryEventRepository,
  type PantryEventRepository,
} from './pantryEventRepository';
import type { PantryEvent, PantryEventOutcome } from './pantryEvent';
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
  quantity: number;
}>;

/**
 * Loads pantry items and queues writes in order after local pantry actions.
 *
 * Pending edits and consumption can be undone without overwriting later actions.
 * A load failure blocks edits; a failed save leaves the local item visible and sets hasSaveError.
 *
 * @param repository - The pantry storage implementation. Defaults to AsyncStorage.
 * @param eventRepository - The outcome-history storage implementation. Defaults to AsyncStorage.
 * @returns Pantry data, state flags, and actions for loading, changing, and undoing items.
 */
export function usePantryItems(
  repository: PantryRepository = asyncStoragePantryRepository,
  eventRepository: PantryEventRepository = asyncStoragePantryEventRepository,
) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [events, setEvents] = useState<PantryEvent[]>([]);
  const [status, setStatus] = useState<PantryLoadStatus>('loading');
  const [hasSaveError, setHasSaveError] = useState(false);
  const [failedActionIds, setFailedActionIds] = useState<string[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const itemsRef = useRef<PantryItem[]>([]);
  const statusRef = useRef<PantryLoadStatus>('loading');
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const baseRef = useRef<PantryItem[]>([]);
  const actionsRef = useRef<PantryAction[]>([]);
  const eventsRef = useRef<PantryEvent[]>([]);
  const actionSequence = useRef(0);

  function saveState(
    nextItems: PantryItem[],
    nextEvents: PantryEvent[],
    actionId: string,
    shouldSaveEvents = false,
  ) {
    itemsRef.current = nextItems;
    eventsRef.current = nextEvents;
    setItems(nextItems);
    setEvents(nextEvents);
    writeQueue.current = writeQueue.current
      .then(async () => {
        await repository.saveItems(nextItems);
        if (shouldSaveEvents) await eventRepository.saveEvents(nextEvents);
      })
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

  /**
   * Creates an action ID that does not collide with persisted history from a
   * previous app session or another pending action in the current session.
   *
   * @returns A unique action identifier.
   */
  function nextActionId() {
    let candidate: string;
    do {
      actionSequence.current += 1;
      candidate = `pantry-action-${actionSequence.current}`;
    } while (
      eventsRef.current.some((event) => event.id === candidate) ||
      actionsRef.current.some((action) => action.id === candidate)
    );
    return candidate;
  }

  function compactActions() {
    const compacted = compactPantryActions(baseRef.current, actionsRef.current);
    baseRef.current = compacted.base;
    actionsRef.current = compacted.actions;
  }

  useEffect(() => {
    let isActive = true;

    Promise.all([repository.loadItems(), eventRepository.loadEvents()]).then(
      ([loadedItems, loadedEvents]) => {
        if (isActive) {
          itemsRef.current = loadedItems;
          eventsRef.current = loadedEvents;
          baseRef.current = loadedItems;
          actionsRef.current = [];
          setItems(loadedItems);
          setEvents(loadedEvents);
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
  }, [eventRepository, repository, loadAttempt]);

  function retryLoad() {
    statusRef.current = 'loading';
    setStatus('loading');
    setLoadAttempt((attempt) => attempt + 1);
  }

  // Adding is only offered once loading succeeds, so a save never overwrites
  // stored items that have not been read yet.
  function addItem(draft: PantryItemDraft) {
    if (statusRef.current !== 'ready' || !isValidPantryQuantity(draft.quantity)) return;
    const action: PantryAction = {
      id: nextActionId(), kind: 'add',
      item: createPantryItem(draft.name, draft.expirationDate, draft.recipeIngredient, new Date(), draft.quantity),
      undoable: false,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveState(replayPantryActions(baseRef.current, actionsRef.current), eventsRef.current, action.id);
    compactActions();
  }

  function updateItem(id: string, draft: PantryItemDraft) {
    if (statusRef.current !== 'ready' || !isValidPantryQuantity(draft.quantity)) return null;
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return null;
    const reference = item.recipeIngredient;
    const newReference = draft.recipeIngredient;
    if (item.name === draft.name && item.expirationDate === draft.expirationDate && item.quantity === draft.quantity &&
      reference?.provider === newReference?.provider && reference?.id === newReference?.id &&
      reference?.name === newReference?.name) return null;

    const action: PantryAction = {
      id: nextActionId(), kind: 'edit', itemId: id,
      changes: {
        ...(item.name !== draft.name ? { name: draft.name } : {}),
        ...(item.expirationDate !== draft.expirationDate ? { expirationDate: draft.expirationDate } : {}),
        ...(item.quantity !== draft.quantity ? { quantity: draft.quantity } : {}),
        ...(reference?.provider !== newReference?.provider || reference?.id !== newReference?.id ||
          reference?.name !== newReference?.name ? { recipeIngredient: newReference } : {}),
      },
      undoable: true,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveState(replayPantryActions(baseRef.current, actionsRef.current), eventsRef.current, action.id);
    return action.id;
  }

  /**
   * Changes one unit using the latest in-memory item, even after rapid taps.
   *
   * @param id - The pantry entry to change.
   * @param delta - One unit to add or remove.
   * @returns The edit action, a zero-boundary signal, or null if unavailable.
   */
  function changeQuantity(id: string, delta: 1 | -1): { status: 'updated'; actionId: string } | { status: 'at-zero' } | null {
    if (statusRef.current !== 'ready') return null;
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return null;
    const nextQuantity = item.quantity + delta;
    if (nextQuantity === 0) return { status: 'at-zero' };
    if (!isValidPantryQuantity(nextQuantity)) return null;
    const actionId = updateItem(id, { ...item, quantity: nextQuantity });
    return actionId ? { status: 'updated', actionId } : null;
  }

  /**
   * Removes an active entry without recording a consumed or wasted outcome.
   *
   * @param id - The pantry entry to remove.
   * @returns Its Undo action ID, or null if it cannot be removed.
   */
  function deleteItem(id: string) {
    if (statusRef.current !== 'ready' || !itemsRef.current.some((item) => item.id === id)) return null;
    const action: PantryAction = { id: nextActionId(), kind: 'delete', itemId: id, undoable: true };
    actionsRef.current = [...actionsRef.current, action];
    saveState(replayPantryActions(baseRef.current, actionsRef.current), eventsRef.current, action.id);
    return action.id;
  }

  function removeItemWithOutcome(id: string, outcome: PantryEventOutcome) {
    if (statusRef.current !== 'ready' || !itemsRef.current.some((item) => item.id === id)) return null;
    const actionId = nextActionId();
    const action: PantryAction = {
      id: actionId,
      kind: outcome === 'consumed' ? 'consume' : 'waste',
      itemId: id,
      undoable: true,
    };
    const item = itemsRef.current.find((candidate) => candidate.id === id)!;
    const event: PantryEvent = {
      id: actionId,
      pantryItemId: item.id,
      itemName: item.name,
      outcome,
      occurredAt: new Date().toISOString(),
      itemSnapshot: item,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      [...eventsRef.current, event],
      action.id,
      true,
    );
    return action.id;
  }

  function consumeItem(id: string) {
    return removeItemWithOutcome(id, 'consumed');
  }

  function wasteItem(id: string) {
    return removeItemWithOutcome(id, 'wasted');
  }

  /**
   * Restores a finalized outcome from the dashboard and removes it from the
   * measured history. Legacy events without an item snapshot are read-only.
   *
   * @param id - The durable outcome event ID selected from dashboard history.
   * @return {boolean} Whether the event was restored and both local states were updated.
   */
  function restoreEvent(id: string) {
    if (statusRef.current !== 'ready') return false;
    const event = eventsRef.current.find((candidate) => candidate.id === id);
    if (!event?.itemSnapshot) return false;
    if (itemsRef.current.some((item) => item.id === event.itemSnapshot!.id)) return false;

    const action: PantryAction = {
      id: nextActionId(),
      kind: 'restore',
      item: event.itemSnapshot,
      undoable: false,
    };
    const nextEvents = eventsRef.current.filter((candidate) => candidate.id !== id);
    actionsRef.current = [...actionsRef.current, action];
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      nextEvents,
      action.id,
      true,
    );
    compactActions();
    return true;
  }

  function undoAction(id: string) {
    const action = actionsRef.current.find((candidate) => candidate.id === id && candidate.undoable);
    if (!action) return false;
    actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
    const shouldSaveEvents = action.kind === 'consume' || action.kind === 'waste';
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      shouldSaveEvents ? eventsRef.current.filter((event) => event.id !== id) : eventsRef.current,
      nextActionId(),
      shouldSaveEvents,
    );
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
    items, events, status, hasSaveError, failedActionIds, addItem, updateItem,
    consumeItem, wasteItem, deleteItem, changeQuantity, undoAction, finalizeAction, retryLoad,
    restoreEvent,
  };
}
