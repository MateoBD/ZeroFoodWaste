import { useEffect, useRef, useState } from 'react';

import { createPantryItem, isValidPantryQuantity, type PantryItem } from './pantryItem';
import { asyncStoragePantryRepository, type PantryRepository } from './pantryRepository';
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
 * @returns Pantry data, state flags, and actions for loading, changing, and undoing items.
 */
export function usePantryItems(
  repository: PantryRepository = asyncStoragePantryRepository,
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
  ) {
    itemsRef.current = nextItems;
    eventsRef.current = nextEvents;
    setItems(nextItems);
    setEvents(nextEvents);
    writeQueue.current = writeQueue.current
      .then(async () => {
        await repository.save({ items: nextItems, events: nextEvents });
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
   * Produces an action ID that cannot collide with restored history from an
   * earlier app session or with another pending action in this session.
   *
   * @returns A unique action identifier for journaling and outcome history.
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

    repository.load().then(
      ({ items: loadedItems, events: loadedEvents }) => {
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
  }, [repository, loadAttempt]);

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

  function updateItem(id: string, draft: PantryItemDraft, consumedUnits = 0) {
    const isRecordedConsumption = isValidPantryQuantity(consumedUnits);
    if (statusRef.current !== 'ready' ||
      (!isRecordedConsumption && !isValidPantryQuantity(draft.quantity)) ||
      (isRecordedConsumption && (!Number.isSafeInteger(draft.quantity) || draft.quantity < 0))) return null;
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return null;
    const reference = item.recipeIngredient;
    const newReference = draft.recipeIngredient;
    if (!isRecordedConsumption && item.name === draft.name && item.expirationDate === draft.expirationDate && item.quantity === draft.quantity &&
      reference?.provider === newReference?.provider && reference?.id === newReference?.id &&
      reference?.name === newReference?.name) return null;

    if (isRecordedConsumption) {
      const quantityBeforeConsumption = draft.quantity + consumedUnits;
      if (!isValidPantryQuantity(quantityBeforeConsumption) || consumedUnits > quantityBeforeConsumption) return null;
      const snapshot: PantryItem = {
        ...item,
        name: draft.name,
        expirationDate: draft.expirationDate,
        recipeIngredient: draft.recipeIngredient,
        quantity: quantityBeforeConsumption,
      };
      const actionId = nextActionId();
      const action: PantryAction = {
        id: actionId,
        kind: 'consume',
        itemId: id,
        amount: consumedUnits,
        changes: {
          name: draft.name,
          expirationDate: draft.expirationDate,
          recipeIngredient: draft.recipeIngredient,
        },
        quantityDelta: quantityBeforeConsumption - item.quantity,
        undoable: true,
      };
      const event: PantryEvent = {
        id: actionId,
        pantryItemId: item.id,
        itemName: draft.name,
        outcome: 'consumed',
        amount: consumedUnits,
        occurredAt: new Date().toISOString(),
        itemSnapshot: snapshot,
      };
      actionsRef.current = [...actionsRef.current, action];
      saveState(replayPantryActions(baseRef.current, actionsRef.current), [...eventsRef.current, event], actionId);
      return actionId;
    }

    const action: PantryAction = {
      id: nextActionId(), kind: 'edit', itemId: id,
      changes: {
        ...(item.name !== draft.name ? { name: draft.name } : {}),
        ...(item.expirationDate !== draft.expirationDate ? { expirationDate: draft.expirationDate } : {}),
        ...(reference?.provider !== newReference?.provider || reference?.id !== newReference?.id ||
          reference?.name !== newReference?.name ? { recipeIngredient: newReference } : {}),
      },
      quantityDelta: draft.quantity - item.quantity,
      undoable: true,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveState(replayPantryActions(baseRef.current, actionsRef.current), eventsRef.current, action.id);
    return action.id;
  }

  function removeItemWithOutcome(id: string, outcome: PantryEventOutcome, amount: number) {
    if (statusRef.current !== 'ready' || !isValidPantryQuantity(amount)) return null;
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item || amount > item.quantity) return null;
    const actionId = nextActionId();
    const action: PantryAction = {
      id: actionId,
      kind: outcome === 'consumed' ? 'consume' : 'waste',
      itemId: id,
      amount,
      undoable: true,
    };
    const event: PantryEvent = {
      id: actionId,
      pantryItemId: item.id,
      itemName: item.name,
      outcome,
      amount,
      occurredAt: new Date().toISOString(),
      itemSnapshot: item,
    };
    actionsRef.current = [...actionsRef.current, action];
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      [...eventsRef.current, event],
      action.id,
    );
    return action.id;
  }

  function consumeItem(id: string, amount: number) {
    return removeItemWithOutcome(id, 'consumed', amount);
  }

  function wasteItem(id: string) {
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    return item ? removeItemWithOutcome(id, 'wasted', item.quantity) : null;
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

    const action: PantryAction = {
      id: nextActionId(),
      kind: 'restore',
      item: event.itemSnapshot,
      amount: event.amount,
      undoable: false,
    };
    const nextEvents = eventsRef.current.filter((candidate) => candidate.id !== id);
    actionsRef.current = [...actionsRef.current, action];
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      nextEvents,
      action.id,
    );
    compactActions();
    return true;
  }

  function undoAction(id: string) {
    const action = actionsRef.current.find((candidate) => candidate.id === id && candidate.undoable);
    if (!action) return false;
    actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
    const shouldRemoveEvent = action.kind === 'consume' || action.kind === 'waste';
    saveState(
      replayPantryActions(baseRef.current, actionsRef.current),
      shouldRemoveEvent ? eventsRef.current.filter((event) => event.id !== id) : eventsRef.current,
      nextActionId(),
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
    consumeItem, wasteItem, undoAction, finalizeAction, retryLoad,
    restoreEvent,
  };
}

