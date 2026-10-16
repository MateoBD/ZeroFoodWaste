import { matchScannedRecipeIngredient } from './recipeIngredientMatch';

const catalog = [
  { provider: 'themealdb' as const, id: '1', name: 'Milk' },
  { provider: 'themealdb' as const, id: '2', name: 'Sugar' },
  { provider: 'themealdb' as const, id: '3', name: 'Hazelnut' },
];

describe('matchScannedRecipeIngredient', () => {
  it('returns the first verified candidate with its provider ID', () => {
    expect(matchScannedRecipeIngredient(['milk', 'Sugar'], catalog)).toEqual(catalog[0]);
  });

  it('matches a safe plural category after an unsupported generic name', () => {
    expect(matchScannedRecipeIngredient(['Semi skimmed milk', 'milks'], catalog)).toEqual(catalog[0]);
  });

  it('does not promote a fuzzy or unrelated candidate', () => {
    expect(matchScannedRecipeIngredient(['Mellanmjölk', 'Milk chocolate'], catalog)).toBeNull();
  });
});
