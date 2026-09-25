import { useEffect, useState } from 'react';

import { createPantryItem, type PantryItem } from './pantryItem';
import { asyncStoragePantryRepository, type PantryRepository } from './pantryRepository';

export type PantryLoadStatus = 'loading' | 'ready' | 'error';

export function usePantryItems(repository: PantryRepository = asyncStoragePantryRepository) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<PantryLoadStatus>('loading');
  const [hasSaveError, setHasSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    repository.loadItems().then(
      (loadedItems) => {
        if (isActive) {
          setItems(loadedItems);
          setStatus('ready');
        }
      },
      () => {
        if (isActive) {
          setStatus('error');
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [repository, loadAttempt]);

  function retryLoad() {
    setStatus('loading');
    setLoadAttempt((attempt) => attempt + 1);
  }

  // Adding is only offered once loading succeeds, so a save never overwrites
  // stored items that have not been read yet.
  function addItem(name: string, expirationDate: string) {
    const nextItems = [...items, createPantryItem(name, expirationDate)];

    setItems(nextItems);
    repository.saveItems(nextItems).then(
      () => setHasSaveError(false),
      () => setHasSaveError(true),
    );
  }

  return { items, status, hasSaveError, addItem, retryLoad };
}
