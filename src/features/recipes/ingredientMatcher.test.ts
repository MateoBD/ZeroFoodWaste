import { matchIngredients, normalizeIngredientQuery } from './ingredientMatcher';

const ingredients = [
  { provider: 'themealdb' as const, id: '1', name: 'Chicken' },
  { provider: 'themealdb' as const, id: '2', name: 'Chicken Stock' },
  { provider: 'themealdb' as const, id: '3', name: 'Black Pepper' },
  { provider: 'themealdb' as const, id: '4', name: 'Smoky Aïoli' },
];

describe('ingredientMatcher', () => {
  it('normalizes case, whitespace, and accents', () => {
    expect(normalizeIngredientQuery('  Smoky AÏOLI ')).toBe('smoky aioli');
  });

  it('ranks exact and prefix matches before broader matches', () => {
    expect(matchIngredients('chicken', ingredients)).toEqual(ingredients.slice(0, 2));
  });

  it('supports close typo matches and limits results', () => {
    expect(matchIngredients('chikcen', ingredients, 1)).toEqual([ingredients[0]]);
  });

  it('does not suggest for a one-character query', () => {
    expect(matchIngredients('c', ingredients)).toEqual([]);
  });
});
