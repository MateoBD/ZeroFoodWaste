/** A time of day used to filter recipe suggestions. */
export type MealTime = 'breakfast' | 'lunch' | 'dinner';

/** Meal times in the order they are offered to the user. */
export const MEAL_TIMES: readonly MealTime[] = ['breakfast', 'lunch', 'dinner'];

/** Lighter provider categories suggested at lunch; dinner accepts every non-breakfast category. */
const LUNCH_CATEGORIES = new Set([
  'Chicken', 'Miscellaneous', 'Pasta', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian',
]);

/**
 * Selects the default meal time for a local hour.
 *
 * Breakfast runs from 04:00, lunch from 11:00, and dinner from 16:00 overnight.
 *
 * @param hour - The local hour of the day, from 0 to 23.
 * @returns The meal time suggested at that hour.
 */
export function mealTimeForHour(hour: number): MealTime {
  if (hour >= 4 && hour < 11) return 'breakfast';
  return hour >= 11 && hour < 16 ? 'lunch' : 'dinner';
}

/**
 * Checks whether a recipe category suits a meal time.
 *
 * Recipes without a category cannot be classified, so they suit every meal time.
 *
 * @param category - The provider category of the recipe, when known.
 * @param mealTime - The meal time being suggested.
 * @returns Whether the recipe should be suggested for the meal time.
 */
export function isRecipeForMealTime(category: string | null | undefined, mealTime: MealTime): boolean {
  if (!category) return true;
  if (mealTime === 'breakfast') return category === 'Breakfast';
  return category !== 'Breakfast' && (mealTime === 'dinner' || LUNCH_CATEGORIES.has(category));
}
