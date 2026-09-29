import type { IngredientCatalogEntry } from './ingredient';

export function normalizeIngredientQuery(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let row = 1; row <= first.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;

    for (let column = 1; column <= second.length; column += 1) {
      const above = previous[column];
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + cost);
      diagonal = above;
    }
  }

  return previous[second.length];
}

function scoreIngredient(query: string, ingredient: string): number | null {
  if (ingredient === query) return 0;
  if (ingredient.startsWith(query)) return 10 + ingredient.length - query.length;

  const words = ingredient.split(' ');
  if (words.some((word) => word.startsWith(query))) return 20 + ingredient.length - query.length;
  if (ingredient.includes(query)) return 30 + ingredient.length - query.length;

  const maximumDistance = query.length < 4 ? 1 : Math.max(1, Math.floor(query.length * 0.4));
  const distance = levenshteinDistance(query, ingredient);
  return distance <= maximumDistance ? 40 + distance : null;
}

export function matchIngredients(
  query: string,
  ingredients: readonly IngredientCatalogEntry[],
  limit = 5,
): IngredientCatalogEntry[] {
  const normalizedQuery = normalizeIngredientQuery(query);
  if (normalizedQuery.length < 2) return [];

  return ingredients
    .map((ingredient, index) => ({
      ingredient,
      index,
      score: scoreIngredient(normalizedQuery, normalizeIngredientQuery(ingredient.name)),
    }))
    .filter((result): result is { ingredient: IngredientCatalogEntry; index: number; score: number } => result.score !== null)
    .sort((first, second) => {
      const scoreDifference = first.score - second.score;
      if (scoreDifference !== 0) return scoreDifference;
      const nameDifference = first.ingredient.name.localeCompare(second.ingredient.name);
      return nameDifference !== 0 ? nameDifference : first.index - second.index;
    })
    .slice(0, limit)
    .map(({ ingredient }) => ingredient);
}
