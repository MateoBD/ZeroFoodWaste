import { isRecipeForMealTime, mealTimeForHour } from './mealTime';

describe('mealTimeForHour', () => {
  it.each([
    [3, 'dinner'], [4, 'breakfast'], [10, 'breakfast'], [11, 'lunch'],
    [15, 'lunch'], [16, 'dinner'], [23, 'dinner'], [0, 'dinner'],
  ] as const)('maps hour %i to %s', (hour, mealTime) => {
    expect(mealTimeForHour(hour)).toBe(mealTime);
  });
});

describe('isRecipeForMealTime', () => {
  it('suggests breakfast recipes only at breakfast', () => {
    expect(isRecipeForMealTime('Breakfast', 'breakfast')).toBe(true);
    expect(isRecipeForMealTime('Breakfast', 'lunch')).toBe(false);
    expect(isRecipeForMealTime('Breakfast', 'dinner')).toBe(false);
  });

  it('suggests lighter categories at lunch and every other category at dinner', () => {
    expect(isRecipeForMealTime('Pasta', 'lunch')).toBe(true);
    expect(isRecipeForMealTime('Pasta', 'dinner')).toBe(true);
    expect(isRecipeForMealTime('Beef', 'lunch')).toBe(false);
    expect(isRecipeForMealTime('Beef', 'dinner')).toBe(true);
    expect(isRecipeForMealTime('Beef', 'breakfast')).toBe(false);
  });

  it('keeps recipes without a category in every meal time', () => {
    expect(isRecipeForMealTime(null, 'breakfast')).toBe(true);
    expect(isRecipeForMealTime(undefined, 'lunch')).toBe(true);
  });
});
