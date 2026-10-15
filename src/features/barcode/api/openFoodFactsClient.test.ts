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
      provider: 'openfoodfacts',
    });
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