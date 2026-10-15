/**
 * A product looked up from a scanned barcode.
 */
export type ProductLookup = Readonly<{
    barcode: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    provider: 'openfoodfacts';
  }>;