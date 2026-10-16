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
    product_name?: string | null;
    product_name_en?: string | null;
    generic_name?: string | null;
    generic_name_en?: string | null;
    lang?: string | null;
    brands?: string | null;
    image_url?: string | null;
    ingredients?: { id?: string | null; is_in_taxonomy?: number | null }[] | null;
    categories_tags?: string[] | null;
  };
};

const NON_FOOD_INGREDIENTS = new Set([
  'additive', 'colour', 'color', 'emulsifier', 'flavouring', 'flavoring',
  'humectant', 'preservative', 'stabiliser', 'stabilizer', 'sweetener', 'water',
]);
const NON_SPECIFIC_CATEGORIES = new Set([
  'beverages', 'dairy-products', 'drinks', 'food', 'foods', 'frozen-foods',
  'groceries', 'plant-based-foods-and-beverages', 'prepared-meals',
  'snacks', 'sweet-snacks',
]);

/**
 * Returns a possible English food name from a canonical Open Food Facts tag.
 *
 * @param tag - A taxonomy ID such as `en:milk`.
 * @returns A readable candidate, or null for unrecognized and processing tags.
 */
function nameFromEnglishTag(tag: string | null | undefined): string | null {
  if (typeof tag !== 'string' || !tag.startsWith('en:')) return null;
  const name = tag.slice(3);
  if (!name || /^e\d+[a-z0-9]*$/.test(name) || NON_FOOD_INGREDIENTS.has(name)) return null;
  return name.replace(/-/g, ' ');
}

/**
 * Builds a short list of possible recipe ingredient names in source priority order.
 *
 * A label ingredient or category is only a candidate; the pantry form verifies
 * names against TheMealDB and lets the user change or clear the link.
 *
 * @param product - The Open Food Facts product payload.
 * @returns Up to eight distinct candidate names.
 */
function recipeIngredientCandidates(product: NonNullable<OpenFoodFactsResponse['product']>): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (value: string | null | undefined) => {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name || name.length > 80 || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    candidates.push(name);
  };

  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const englishDescription = `${product.generic_name_en ?? ''} ${product.product_name_en ?? ''}`.toLowerCase();
  for (const ingredient of ingredients) {
    const name = ingredient && ingredient.is_in_taxonomy !== 0
      ? nameFromEnglishTag(ingredient.id) : null;
    // A component of a mixed food needs support from its English description.
    if (name && (ingredients.length === 1 || englishDescription.includes(name))) add(name);
    if (candidates.length >= 3) break;
  }
  add(product.generic_name_en);
  if (product.lang === 'en') add(product.generic_name);
  add(product.product_name_en);
  if (product.lang === 'en') add(product.product_name);
  const categories = Array.isArray(product.categories_tags) ? product.categories_tags : [];
  for (const category of [...categories].reverse()) {
    if (typeof category !== 'string' || NON_SPECIFIC_CATEGORIES.has(category.slice(3))) continue;
    add(nameFromEnglishTag(category));
    if (candidates.length >= 8) break;
  }
  return candidates.slice(0, 8);
}

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
    name: product.product_name?.trim() || product.product_name_en?.trim() ||
      product.generic_name?.trim() || product.generic_name_en?.trim() || null,
    brand: product.brands?.trim() || null,
    imageUrl: product.image_url ?? null,
    recipeIngredientCandidates: recipeIngredientCandidates(product),
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
