import { matchIngredients, normalizeIngredientQuery } from './ingredientMatcher';

const ingredients = [
  { provider: 'themealdb' as const, id: '1', name: 'Chicken' },
  { provider: 'themealdb' as const, id: '2', name: 'Chicken Stock' },
  { provider: 'themealdb' as const, id: '3', name: 'Black Pepper' },
  { provider: 'themealdb' as const, id: '4', name: 'Smoky Aïoli' },
  { provider: 'themealdb' as const, id: '5', name: 'Garlic' },
];

describe('ingredientMatcher', () => {
  it('normalizes case, whitespace, and accents', () => {
    expect(normalizeIngredientQuery('  Smoky AÏOLI ')).toBe('smoky aioli');
  });

  it('ranks exact matches before prefix matches', () => {
    expect(matchIngredients('chicken', ingredients)).toEqual([
      ingredients[0],
      ingredients[1],
    ]);
  });

  it('matches a prefix at the beginning of a later word', () => {
    expect(matchIngredients('pep', ingredients)).toEqual([ingredients[2]]);
  });

  it('matches a substring after prefix matches', () => {
    expect(matchIngredients('lic', ingredients)).toEqual([ingredients[4]]);
  });

  it('matches names after removing diacritics', () => {
    expect(matchIngredients('aioli', ingredients)).toEqual([ingredients[3]]);
  });

  it('accepts typos within the length-based edit-distance threshold', () => {
    expect(matchIngredients('chikcen', ingredients)).toEqual([ingredients[0]]);
  });

  it('rejects distant matches outside the typo threshold', () => {
    expect(matchIngredients('zzzzzz', ingredients)).toEqual([]);
  });

  it('orders equal-scoring matches by name and preserves input order for equal names', () => {
    const equalScores = [
      { provider: 'themealdb' as const, id: 'mango', name: 'Mango' },
      { provider: 'themealdb' as const, id: 'candy-1', name: 'Candy' },
      { provider: 'themealdb' as const, id: 'candy-2', name: 'Candy' },
    ];

    expect(matchIngredients('an', equalScores)).toEqual([
      equalScores[1],
      equalScores[2],
      equalScores[0],
    ]);
  });

  it('returns five results by default and supports an explicit limit', () => {
    const apples = Array.from({ length: 6 }, (_, index) => ({
      provider: 'themealdb' as const,
      id: String(index + 1),
      name: `Apple ${index + 1}`,
    }));

    expect(matchIngredients('apple', apples)).toEqual(apples.slice(0, 5));
    expect(matchIngredients('apple', apples, 2)).toEqual(apples.slice(0, 2));
  });

  it('does not suggest for an empty or one-character query', () => {
    expect(matchIngredients('   ', ingredients)).toEqual([]);
    expect(matchIngredients('c', ingredients)).toEqual([]);
  });
});
