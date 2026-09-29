import { theMealDbRecipeProvider } from './theMealDbClient';

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
});