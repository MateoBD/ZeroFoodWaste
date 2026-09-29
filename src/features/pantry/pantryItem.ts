import type { IngredientReference } from '@/features/recipes/ingredient';

export type PantryItem = Readonly<{
  id: string;
  name: string;
  recipeIngredient: IngredientReference | null;
  // Package expiry as a date-only YYYY-MM-DD value, never a UTC instant.
  expirationDate: string;
  createdAt: string;
}>;

export function createPantryItem(
  name: string,
  expirationDate: string,
  recipeIngredient: IngredientReference | null = null,
  now: Date = new Date(),
): PantryItem {
  const randomPart = Math.random().toString(36).slice(2, 10);

  return {
    id: `item-${now.getTime().toString(36)}-${randomPart}`,
    name,
    recipeIngredient,
    expirationDate,
    createdAt: now.toISOString(),
  };
}
