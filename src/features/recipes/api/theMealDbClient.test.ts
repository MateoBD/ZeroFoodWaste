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

  it('returns full recipe details with only populated ingredients', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meals: [{
          idMeal: '52772',
          strMeal: 'Teriyaki Chicken Casserole',
          strMealThumb: 'https://example.com/chicken.jpg',
          strInstructions: ' Bake until cooked. ',
          strSource: ' https://example.com/source ',
          strCategory: 'Chicken',
          strIngredient1: 'Chicken',
          strMeasure1: '3 cups',
          strIngredient2: 'Rice',
          strMeasure2: ' ',
          strIngredient3: '',
          strMeasure3: '1 tsp',
        }],
      }),
    } as Response);

    await expect(theMealDbRecipeProvider.getById('52772')).resolves.toEqual({
      id: '52772',
      name: 'Teriyaki Chicken Casserole',
      imageUrl: 'https://example.com/chicken.jpg',
      provider: 'themealdb',
      ingredients: [
        { name: 'Chicken', measure: '3 cups' },
        { name: 'Rice', measure: null },
      ],
      instructions: 'Bake until cooked.',
      sourceUrl: 'https://example.com/source',
      category: 'Chicken',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772',
    );
  });

  it('returns null when a recipe ID has no match', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: null }),
    } as Response);

    await expect(theMealDbRecipeProvider.getById('missing')).resolves.toBeNull();
  });

  it('throws when recipe lookup responds with an error status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(theMealDbRecipeProvider.getById('52772')).rejects.toThrow(
      'TheMealDB recipe lookup failed with status 503',
    );
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
