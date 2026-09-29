import { useEffect, useState } from 'react';

import { theMealDbIngredientProvider } from './api/theMealDbClient';
import type { IngredientCatalogEntry } from './ingredient';
import { asyncStorageIngredientCatalog, INGREDIENT_CATALOG_MAX_AGE_MS } from './ingredientCatalogStorage';

/**
 * Represents the state of ingredient suggestions while the pantry form is open.
 */
export type IngredientCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Loads cached suggestions when enabled, refreshing stale data from TheMealDB.
 *
 * A service or cache-write failure preserves cached suggestions when available.
 *
 * @param enabled - Whether the pantry form currently needs ingredient suggestions.
 * @returns The available catalogue entries and their current load status.
 */
export function useIngredientCatalog(enabled: boolean) {
  const [items, setItems] = useState<IngredientCatalogEntry[]>([]);
  const [status, setStatus] = useState<IngredientCatalogStatus>('idle');

  useEffect(() => {
    if (!enabled) return undefined;

    let isActive = true;

    async function loadCatalog() {
      let cached = null;
      try {
        cached = await asyncStorageIngredientCatalog.load();
      } catch {
        cached = null;
      }

      if (!isActive) return;
      setStatus('loading');
      if (cached) {
        setItems(cached.items);
        if (Date.now() - new Date(cached.fetchedAt).getTime() < INGREDIENT_CATALOG_MAX_AGE_MS) {
          setStatus('ready');
          return;
        }
      }

      try {
        const freshItems = await theMealDbIngredientProvider.listIngredients();
        if (!isActive) return;
        if (freshItems.length > 0) {
          const freshCache = { fetchedAt: new Date().toISOString(), items: freshItems };
          setItems(freshItems);
          setStatus('ready');
          try {
            await asyncStorageIngredientCatalog.save(freshCache);
          } catch {
            // A cache write failure must not make the form unusable.
          }
        } else {
          setStatus(cached ? 'ready' : 'error');
        }
      } catch {
        if (isActive) setStatus(cached ? 'ready' : 'error');
      }
    }

    void loadCatalog();
    return () => {
      isActive = false;
    };
  }, [enabled]);

  return { items, status };
}
