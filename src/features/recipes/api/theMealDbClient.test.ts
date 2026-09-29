import { theMealDbIngredientProvider, theMealDbRecipeProvider } from './theMealDbClient';

describe('theMealDbRecipeProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns recipes translated from TheMealDB response', async () => {
    const fakeResponse = {
      meals: [
        { idMeal: '1', strMeal: 'Chicken Curry', strMealThumb: 'https://example.com/1.jpg' },
      ],
    };

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    } as Response);

    const result = await theMealDbRecipeProvider.searchByIngredient('chicken');

    expect(result).toEqual([
      { id: '1', name: 'Chicken Curry', imageUrl: 'https://example.com/1.jpg', provider: 'themealdb' },
    ]);
  });

  it('returns an empty array when TheMealDB has no matches', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);

    const result = await theMealDbRecipeProvider.searchByIngredient('doesnotexist');

    expect(result).toEqual([]);
  });

  it('throws when TheMealDB responds with an error status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(theMealDbRecipeProvider.searchByIngredient('chicken')).rejects.toThrow();
  });

  it('maps the English ingredient catalogue', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [
          { idIngredient: '2', strIngredient: 'Milk' },
          { idIngredient: '1', strIngredient: 'Chicken' },
          { idIngredient: '2', strIngredient: 'Duplicate' },
        ],
      }),
    } as Response);

    await expect(theMealDbIngredientProvider.listIngredients()).resolves.toEqual([
      { provider: 'themealdb', id: '1', name: 'Chicken' },
      { provider: 'themealdb', id: '2', name: 'Milk' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/list.php?i=list',
    );
  });

  it('returns no ingredients when the catalogue is empty', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);

    await expect(theMealDbIngredientProvider.listIngredients()).resolves.toEqual([]);
  });

  it('throws when the ingredient catalogue responds with an error status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(theMealDbIngredientProvider.listIngredients()).rejects.toThrow(
      'TheMealDB ingredient request failed with status 503',
    );
  });

  it('filters malformed entries, trims values, deduplicates IDs, and sorts names', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [
          null,
          [],
          {},
          { idIngredient: 1, strIngredient: 'Numeric ID' },
          { idIngredient: ' ', strIngredient: 'Blank ID' },
          { idIngredient: '2', strIngredient: 42 },
          { idIngredient: '3', strIngredient: '   ' },
          { idIngredient: ' 9 ', strIngredient: '  Zucchini  ' },
          { idIngredient: '7', strIngredient: '  Apple  ' },
          { idIngredient: '9', strIngredient: 'Duplicate ID' },
        ],
      }),
    } as Response);

    await expect(theMealDbIngredientProvider.listIngredients()).resolves.toEqual([
      { provider: 'themealdb', id: '7', name: 'Apple' },
      { provider: 'themealdb', id: '9', name: 'Zucchini' },
    ]);
  });
});
