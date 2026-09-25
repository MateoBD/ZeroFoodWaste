import { useEffect, useRef, useState } from 'react';

import { createPantryItem, type PantryItem } from './pantryItem';
import { asyncStoragePantryRepository, type PantryRepository } from './pantryRepository';

export type PantryLoadStatus = 'loading' | 'ready' | 'error';

export function usePantryItems(repository: PantryRepository = asyncStoragePantryRepository) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<PantryLoadStatus>('loading');
  const [hasSaveError, setHasSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const itemsRef = useRef<PantryItem[]>([]);
  const statusRef = useRef<PantryLoadStatus>('loading');
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let isActive = true;

    repository.loadItems().then(
      (loadedItems) => {
        if (isActive) {
          itemsRef.current = loadedItems;
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
  function addItem(name: string, expirationDate: string) {
    if (statusRef.current !== 'ready') return;
    const nextItems = [...itemsRef.current, createPantryItem(name, expirationDate)];

    itemsRef.current = nextItems;
    setItems(nextItems);
    writeQueue.current = writeQueue.current
      .then(() => repository.saveItems(nextItems))
      .then(
        () => setHasSaveError(false),
        () => setHasSaveError(true),
      );
  }

  return { items, status, hasSaveError, addItem, retryLoad };
}
