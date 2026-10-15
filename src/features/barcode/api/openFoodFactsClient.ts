import type { ProductLookup } from '../product';
import type { ProductLookupProvider } from '../productProvider';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';

/**
 * Builds the Open Food Facts product-lookup URL for one barcode.
 *
 * @param barcode - The scanned barcode (EAN/UPC digits).
 * @returns The complete product-lookup URL.
 */
function buildProductLookupUrl(barcode: string): string {
  return `${BASE_URL}/product/${encodeURIComponent(barcode)}`;
}

type OpenFoodFactsResponse = {
  status: number;
  product?: {
    product_name: string | null;
    brands: string | null;
    image_url: string | null;
  };
};

/**
 * Translates the fields returned by Open Food Facts into the app's shape.
 *
 * @param barcode - The scanned barcode used for the lookup.
 * @param product - The raw product payload returned by Open Food Facts.
 * @returns The app's provider-independent product lookup result.
 */
function toProductLookup(barcode: string, product: NonNullable<OpenFoodFactsResponse['product']>): ProductLookup {
  return {
    barcode,
    name: product.product_name?.trim() || null,
    brand: product.brands?.trim() || null,
    imageUrl: product.image_url,
    provider: 'openfoodfacts',
  };
}

/**
 * Requests and translates a product lookup by barcode from Open Food Facts.
 *
 * @param barcode - The scanned barcode to look up.
 * @returns The translated product, or `null` when no product was found.
 * @throws When the network request fails or the response is unsuccessful.
 */
async function fetchProductByBarcode(barcode: string): Promise<ProductLookup | null> {
  const response = await fetch(buildProductLookupUrl(barcode));

  if (!response.ok) {
    throw new Error(`Open Food Facts request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenFoodFactsResponse;

  if (data.status !== 1 || !data.product) {
    return null;
  }

  return toProductLookup(barcode, data.product);
}

/**
 * Open Food Facts product-lookup adapter.
 *
 * Requests reject for network, HTTP, or response-decoding failures.
 */
export const openFoodFactsProvider: ProductLookupProvider = {
  getByBarcode(barcode) {
    return fetchProductByBarcode(barcode);
  },
};