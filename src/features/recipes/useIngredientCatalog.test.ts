import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  encodeIngredientCatalogCache,
  INGREDIENT_CATALOG_STORAGE_KEY,
  parseIngredientCatalogCache,
} from './ingredientCatalogStorage';
import { useIngredientCatalog } from './useIngredientCatalog';

const staleCache = {
  fetchedAt: '2000-01-01T00:00:00.000Z',
  items: [{ provider: 'themealdb' as const, id: '1', name: 'Chicken' }],
};

const freshItems = [
  { provider: 'themealdb' as const, id: '2', name: 'Milk' },
  { provider: 'themealdb' as const, id: '3', name: 'Rice' },
];

function ingredientResponse(items = freshItems): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      meals: items.map((item) => ({ idIngredient: item.id, strIngredient: item.name })),
    }),
  } as Response;
}

describe('useIngredientCatalog', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stays idle without reading storage when disabled', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { result } = await renderHook(() => useIngredientCatalog(false));

    expect(result.current).toEqual({ items: [], status: 'idle' });
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses a fresh cache without making a network request', async () => {
    const cache = { ...staleCache, fetchedAt: '2999-01-01T00:00:00.000Z' };
    await AsyncStorage.setItem(
      INGREDIENT_CATALOG_STORAGE_KEY,
      encodeIngredientCatalogCache(cache),
    );
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: cache.items, status: 'ready' }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows stale items while refreshing, then updates the items and cache', async () => {
    await AsyncStorage.setItem(
      INGREDIENT_CATALOG_STORAGE_KEY,
      encodeIngredientCatalogCache(staleCache),
    );
    let resolveFetch!: (response: Response) => void;
    jest.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => {
      expect(result.current).toEqual({ items: staleCache.items, status: 'loading' });
    });
    await act(async () => resolveFetch(ingredientResponse()));
    await waitFor(() => expect(result.current).toEqual({ items: freshItems, status: 'ready' }));

    const saved = parseIngredientCatalogCache(
      await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY),
    );
    expect(saved?.items).toEqual(freshItems);
    expect(new Date(saved!.fetchedAt).toISOString()).toBe(saved?.fetchedAt);
  });

  it('retains stale items when refreshing fails', async () => {
    await AsyncStorage.setItem(
      INGREDIENT_CATALOG_STORAGE_KEY,
      encodeIngredientCatalogCache(staleCache),
    );
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: staleCache.items, status: 'ready' }));
    expect(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY)).toBe(
      encodeIngredientCatalogCache(staleCache),
    );
  });

  it('retains stale items when refreshing returns an empty catalogue', async () => {
    await AsyncStorage.setItem(
      INGREDIENT_CATALOG_STORAGE_KEY,
      encodeIngredientCatalogCache(staleCache),
    );
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: staleCache.items, status: 'ready' }));
    expect(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY)).toBe(
      encodeIngredientCatalogCache(staleCache),
    );
  });

  it.each([
    ['missing', null],
    ['damaged', '{not valid json'],
  ])('fetches and stores the catalogue when the cache is %s', async (_label, raw) => {
    if (raw !== null) {
      await AsyncStorage.setItem(INGREDIENT_CATALOG_STORAGE_KEY, raw);
    }
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientResponse());

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: freshItems, status: 'ready' }));
    expect(
      parseIngredientCatalogCache(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY))?.items,
    ).toEqual(freshItems);
  });

  it.each(['network failure', 'empty response'])(
    'reports an error for a missing cache and %s',
    async (failure) => {
      if (failure === 'network failure') {
        jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
      } else {
        jest.spyOn(globalThis, 'fetch').mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ meals: null }),
        } as Response);
      }

      const { result } = await renderHook(() => useIngredientCatalog(true));

      await waitFor(() => expect(result.current).toEqual({ items: [], status: 'error' }));
      expect(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY)).toBeNull();
    },
  );

  it('continues with a network fetch when reading the cache fails', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage unavailable'));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientResponse());

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: freshItems, status: 'ready' }));
  });

  it('keeps fetched items usable when writing the cache fails', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage full'));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(ingredientResponse());

    const { result } = await renderHook(() => useIngredientCatalog(true));

    await waitFor(() => expect(result.current).toEqual({ items: freshItems, status: 'ready' }));
  });

  it('does not fetch after unmounting during a pending cache read', async () => {
    let finishRead!: (value: string | null) => void;
    jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
      () => new Promise((resolve) => {
        finishRead = resolve;
      }),
    );
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { unmount } = await renderHook(() => useIngredientCatalog(true));

    await unmount();
    await act(async () => finishRead(null));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not update the cache after unmounting during a pending refresh', async () => {
    await AsyncStorage.setItem(
      INGREDIENT_CATALOG_STORAGE_KEY,
      encodeIngredientCatalogCache(staleCache),
    );
    let resolveFetch!: (response: Response) => void;
    jest.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result, unmount } = await renderHook(() => useIngredientCatalog(true));
    await waitFor(() => expect(result.current.status).toBe('loading'));

    await unmount();
    await act(async () => resolveFetch(ingredientResponse()));

    expect(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY)).toBe(
      encodeIngredientCatalogCache(staleCache),
    );
  });
});
