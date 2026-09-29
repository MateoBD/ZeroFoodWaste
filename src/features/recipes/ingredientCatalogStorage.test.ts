import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asyncStorageIngredientCatalog,
  encodeIngredientCatalogCache,
  INGREDIENT_CATALOG_STORAGE_KEY,
  parseIngredientCatalogCache,
} from './ingredientCatalogStorage';

const cache = {
  fetchedAt: '2026-09-29T10:00:00.000Z',
  items: [{ provider: 'themealdb' as const, id: '1', name: 'Chicken' }],
};

describe('ingredient catalog storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('round-trips a valid cache', () => {
    expect(parseIngredientCatalogCache(encodeIngredientCatalogCache(cache))).toEqual(cache);
    expect(parseIngredientCatalogCache(null)).toBeNull();
  });

  it.each([
    ['invalid JSON', 'not json'],
    ['unsupported version', JSON.stringify({ version: 2, ...cache })],
    ['missing timestamp', JSON.stringify({ version: 1, items: cache.items })],
    ['non-date timestamp', JSON.stringify({ version: 1, ...cache, fetchedAt: 'not-a-date' })],
    ['non-canonical timestamp', JSON.stringify({ version: 1, ...cache, fetchedAt: '2026-09-29' })],
    ['non-array items', JSON.stringify({ version: 1, ...cache, items: null })],
    ['non-object reference', JSON.stringify({ version: 1, ...cache, items: [null] })],
    ['array reference', JSON.stringify({ version: 1, ...cache, items: [[]] })],
    ['wrong provider', JSON.stringify({ version: 1, ...cache, items: [{ ...cache.items[0], provider: 'other' }] })],
    ['missing ID', JSON.stringify({ version: 1, ...cache, items: [{ provider: 'themealdb', name: 'Chicken' }] })],
    ['blank ID', JSON.stringify({ version: 1, ...cache, items: [{ ...cache.items[0], id: '  ' }] })],
    ['non-string ID', JSON.stringify({ version: 1, ...cache, items: [{ ...cache.items[0], id: 1 }] })],
    ['missing name', JSON.stringify({ version: 1, ...cache, items: [{ provider: 'themealdb', id: '1' }] })],
    ['blank name', JSON.stringify({ version: 1, ...cache, items: [{ ...cache.items[0], name: '  ' }] })],
    ['non-string name', JSON.stringify({ version: 1, ...cache, items: [{ ...cache.items[0], name: 1 }] })],
  ])('rejects %s', (_label, raw) => {
    expect(parseIngredientCatalogCache(raw)).toBeNull();
  });

  it('loads the cache from its dedicated AsyncStorage key', async () => {
    await AsyncStorage.setItem(INGREDIENT_CATALOG_STORAGE_KEY, encodeIngredientCatalogCache(cache));

    await expect(asyncStorageIngredientCatalog.load()).resolves.toEqual(cache);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(INGREDIENT_CATALOG_STORAGE_KEY);
  });

  it('saves the versioned cache to its dedicated AsyncStorage key', async () => {
    await asyncStorageIngredientCatalog.save(cache);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      INGREDIENT_CATALOG_STORAGE_KEY,
      JSON.stringify({ version: 1, ...cache }),
    );
    expect(
      parseIngredientCatalogCache(await AsyncStorage.getItem(INGREDIENT_CATALOG_STORAGE_KEY)),
    ).toEqual(cache);
  });
});
