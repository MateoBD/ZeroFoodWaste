import type { ProductLookup } from './product';

/**
 * Defines the boundary for looking up a product by its barcode.
 *
 * A null result means the barcode was not found in the provider's database,
 * which is a normal outcome, not an error. Provider failures reject so
 * callers can fall back to manual entry.
 */
export interface ProductLookupProvider {
  /**
   * Looks up a product by its scanned barcode.
   *
   * @param barcode - The scanned barcode (EAN/UPC digits).
   * @returns The matching product, or `null` when no product was found.
   * @throws When the provider request or response decoding fails.
   */
  getByBarcode(barcode: string): Promise<ProductLookup | null>;
}