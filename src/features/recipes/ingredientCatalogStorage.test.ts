import {
  encodeIngredientCatalogCache,
  parseIngredientCatalogCache,
} from './ingredientCatalogStorage';

const cache = {
  fetchedAt: '2026-09-29T10:00:00.000Z',
  items: [{ provider: 'themealdb' as const, id: '1', name: 'Chicken' }],
};

describe('ingredient catalog storage', () => {
  it('round-trips a valid cache', () => {
    expect(parseIngredientCatalogCache(encodeIngredientCatalogCache(cache))).toEqual(cache);
  });

  it('rejects malformed cache data', () => {
    expect(parseIngredientCatalogCache('not json')).toBeNull();
    expect(parseIngredientCatalogCache(JSON.stringify({ version: 2, ...cache }))).toBeNull();
    expect(parseIngredientCatalogCache(JSON.stringify({ version: 1, ...cache, items: [{ id: '1' }] }))).toBeNull();
  });
});
