import type { IngredientReference } from '@/features/recipes/ingredient';

/**
 * Represents one stored pantry entry.
 *
 * The expiration date is a package date in YYYY-MM-DD format, not a UTC instant.
 */
export type PantryItem = Readonly<{
  id: string;
  name: string;
  recipeIngredient: IngredientReference | null;
  expirationDate: string;
  createdAt: string;
}>;

/**
 * Creates a pantry item with a generated ID and an ISO creation timestamp.
 *
 * @param name - The user-provided food name.
 * @param expirationDate - The package expiration date in YYYY-MM-DD format.
 * @param recipeIngredient - The selected recipe ingredient, or null for manual food.
 * @param now - The time used for the ID and creation timestamp. Defaults to now.
 * @returns A new pantry item.
 * @throws RangeError when `now` is not a valid Date.
 */
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
