import { openFoodFactsProvider } from './openFoodFactsClient';

describe('openFoodFactsProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the product translated from the Open Food Facts response', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 1,
        product: {
          product_name: 'Nutella',
          brands: 'Ferrero',
          image_url: 'https://example.com/nutella.jpg',
        },
      }),
    } as Response);

    const result = await openFoodFactsProvider.getByBarcode('3017624010701');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://world.openfoodfacts.org/api/v2/product/3017624010701',
    );
    expect(result).toEqual({
      barcode: '3017624010701',
      name: 'Nutella',
      brand: 'Ferrero',
      imageUrl: 'https://example.com/nutella.jpg',
      recipeIngredientCandidates: [],
      provider: 'openfoodfacts',
    });
  });

  it('prefers a single canonical ingredient over English names and categories', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: {
        product_name: 'Mjölk', lang: 'sv',
        ingredients: [{ id: 'en:milk', is_in_taxonomy: 1 }],
        generic_name_en: 'Whole milk',
        categories_tags: ['en:dairy-products', 'en:milks'],
      } }),
    } as Response);

    const product = await openFoodFactsProvider.getByBarcode('123');
    expect(product).toMatchObject({
      name: 'Mjölk',
      recipeIngredientCandidates: ['milk', 'Whole milk', 'milks'],
    });
  });

  it('ignores uncorroborated components of mixed products and processing tags', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: {
        product_name: 'Chokladkräm', lang: 'sv', generic_name_en: 'Hazelnut spread',
        ingredients: [
          { id: 'en:sugar', is_in_taxonomy: 1 },
          { id: 'en:e322', is_in_taxonomy: 1 },
          { id: 'en:hazelnut', is_in_taxonomy: 1 },
        ],
        categories_tags: ['en:foods', 'en:spreads'],
      } }),
    } as Response);

    const product = await openFoodFactsProvider.getByBarcode('456');
    expect(product?.recipeIngredientCandidates).toEqual(['hazelnut', 'Hazelnut spread', 'spreads']);
  });

  it('uses an English generic name or specific category when ingredients are absent', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: {
        product_name: 'Mellanmjölk', lang: 'sv', generic_name_en: 'Semi skimmed milk',
        categories_tags: ['en:beverages', 'en:milks'],
      } }),
    } as Response);

    const product = await openFoodFactsProvider.getByBarcode('789');
    expect(product?.recipeIngredientCandidates).toEqual(['Semi skimmed milk', 'milks']);
  });

  it('returns null when the barcode is not in the database', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 0 }),
    } as Response);

    const result = await openFoodFactsProvider.getByBarcode('0000000000000');

    expect(result).toBeNull();
  });

  it('turns a blank product name into null', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 1,
        product: { product_name: '   ', brands: null, image_url: null },
      }),
    } as Response);

    const result = await openFoodFactsProvider.getByBarcode('3017624010701');

    expect(result).toMatchObject({ name: null, brand: null, imageUrl: null });
  });

  it('throws when Open Food Facts responds with an error status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(openFoodFactsProvider.getByBarcode('3017624010701')).rejects.toThrow();
  });
});
