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
  quantity: number;
  createdAt: string;
}>;

/**
 * Checks whether a quantity represents at least one whole pantry unit.
 *
 * @param value - The value to validate.
 * @returns Whether it is a positive safe integer.
 */
export function isValidPantryQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/**
 * Creates a pantry item with a generated ID and an ISO creation timestamp.
 *
 * @param name - The user-provided food name.
 * @param expirationDate - The package expiration date in YYYY-MM-DD format.
 * @param recipeIngredient - The selected recipe ingredient, or null for manual food.
 * @param now - The time used for the ID and creation timestamp. Defaults to now.
 * @param quantity - How many units of the food the user has. Defaults to 1.
 * @returns A new pantry item.
 * @throws RangeError when `now` is invalid or quantity is not a positive safe integer.
 */
export function createPantryItem(
  name: string,
  expirationDate: string,
  recipeIngredient: IngredientReference | null = null,
  now: Date = new Date(),
  quantity = 1,
): PantryItem {
  if (!isValidPantryQuantity(quantity)) throw new RangeError('Invalid pantry quantity');
  const randomPart = Math.random().toString(36).slice(2, 10);

  return {
    id: `item-${now.getTime().toString(36)}-${randomPart}`,
    name,
    recipeIngredient,
    expirationDate,
    quantity,
    createdAt: now.toISOString(),
  };
}
