import type { IngredientCatalogProvider } from '../ingredientProvider';
import type { IngredientCatalogEntry } from '../ingredient';
import type { RecipeProvider } from '../recipeProvider';
import type { RecipeDetail, RecipeIngredient, RecipeSummary } from '../recipe';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

/**
 * Builds a TheMealDB filter URL for one canonical ingredient name.
 *
 * @param ingredient - The ingredient name to URL-encode.
 * @returns The complete ingredient-filter URL.
 */
function buildFilterByIngredientUrl(ingredient: string): string {
  const encodedIngredient = encodeURIComponent(ingredient);
  return `${BASE_URL}/filter.php?i=${encodedIngredient}`;
}

/**
 * Builds the URL used to request a complete recipe by its TheMealDB ID.
 *
 * @param mealId - The TheMealDB meal identifier.
 * @returns The encoded TheMealDB recipe-lookup URL.
 */
function buildMealLookupUrl(mealId: string): string {
  return `${BASE_URL}/lookup.php?i=${encodeURIComponent(mealId)}`;
}

function buildIngredientListUrl(): string {
  return `${BASE_URL}/list.php?i=list`;
}

/**
 * Searches TheMealDB for recipe summaries containing one ingredient.
 *
 * A null meals response is treated as a successful search with no matches.
 *
 * @param ingredient - The canonical ingredient name to search for.
 * @returns Recipe summaries returned by TheMealDB.
 * @throws When the network request fails, the response is unsuccessful, or JSON decoding fails.
 */
async function fetchMealsByIngredient(ingredient: string): Promise<RecipeSummary[]> {
    const url = buildFilterByIngredientUrl(ingredient);
    const response = await fetch(url);
  
    if (!response.ok) {
      throw new Error(`TheMealDB request failed with status ${response.status}`);
    }
  
    const data = (await response.json()) as { meals: TheMealDbMealSummary[] | null };
  
    if (!data.meals) {
      return [];
    }
  
    return data.meals.map(toRecipeSummary);
}

/**
 * Requests and translates the complete recipe identified by a TheMealDB meal ID.
 *
 * @param mealId - The TheMealDB meal identifier.
 * @returns The translated recipe, or `null` when the API has no matching meal.
 */
async function fetchMealById(mealId: string): Promise<RecipeDetail | null> {
  const response = await fetch(buildMealLookupUrl(mealId));

  if (!response.ok) {
    throw new Error(`TheMealDB recipe lookup failed with status ${response.status}`);
  }

  const data = (await response.json()) as { meals: TheMealDbMealDetail[] | null };
  return data.meals?.[0] ? toRecipeDetail(data.meals[0]) : null;
}

type TheMealDbMealSummary = {
    idMeal: string;
    strMeal: string;
    strMealThumb: string | null;
    strArea: string | null;
    strCountry: string | null;
};

type TheMealDbMealDetail = TheMealDbMealSummary & {
  strInstructions: string | null;
  strSource: string | null;
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
};

type TheMealDbIngredient = {
  idIngredient: string;
  strIngredient: string;
};
  
/**
 * Translates the fields returned by TheMealDB's filter endpoint.
 *
 * @param meal - The raw meal summary returned by TheMealDB.
 * @returns The app's provider-independent recipe summary.
 */
function toRecipeSummary(meal: TheMealDbMealSummary): RecipeSummary {
    return {
      id: meal.idMeal,
      name: meal.strMeal,
      imageUrl: meal.strMealThumb,
      provider: 'themealdb',
    };
}

/**
 * Removes blank strings from optional TheMealDB fields.
 *
 * @param value - A possibly blank TheMealDB string field.
 * @returns The trimmed value, or `null` when it has no usable text.
 */
function toOptionalTrimmedString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Converts TheMealDB's numbered ingredient and measure fields into a list.
 *
 * @param meal - The raw recipe detail returned by TheMealDB.
 * @returns Populated ingredient entries with their optional measures.
 */
function toRecipeIngredients(meal: TheMealDbMealDetail): RecipeIngredient[] {
  return Array.from({ length: 20 }, (_, index) => index + 1)
    .map((position) => {
      const name = toOptionalTrimmedString(meal[`strIngredient${position}`]);
      if (!name) return null;
      return { name, measure: toOptionalTrimmedString(meal[`strMeasure${position}`]) };
    })
    .filter((ingredient): ingredient is RecipeIngredient => ingredient !== null);
}

/**
 * Translates the complete recipe payload returned by TheMealDB's lookup endpoint.
 *
 * @param meal - The raw recipe detail returned by TheMealDB.
 * @returns The app's provider-independent recipe detail.
 */
function toRecipeDetail(meal: TheMealDbMealDetail): RecipeDetail {
  return {
    ...toRecipeSummary(meal),
    ingredients: toRecipeIngredients(meal),
    instructions: meal.strInstructions?.trim() ?? '',
    sourceUrl: toOptionalTrimmedString(meal.strSource),
  };
}

/**
 * TheMealDB recipe adapter.
 *
 * Supports searching recipes by ingredient and retrieving complete recipe
 * details by meal ID.
 *
 * Requests reject for network, HTTP, or response-decoding failures.
 */
export const theMealDbRecipeProvider: RecipeProvider = {
    searchByIngredient(ingredient) {
      return fetchMealsByIngredient(ingredient);
    },
    getById(mealId) {
      return fetchMealById(mealId);
  },
};

/**
 * Provides a validated, deduplicated, and sorted English ingredient catalogue.
 *
 * The provider returns an empty array when TheMealDB returns no catalogue.
 * Requests reject for network, HTTP, or response-decoding failures.
 */
export const theMealDbIngredientProvider: IngredientCatalogProvider = {
  async listIngredients(): Promise<IngredientCatalogEntry[]> {
    const response = await fetch(buildIngredientListUrl());

    if (!response.ok) {
      throw new Error(`TheMealDB ingredient request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { meals: unknown[] | null };
    if (!data.meals) return [];

    const seenIds = new Set<string>();
    return data.meals
      .filter((ingredient): ingredient is TheMealDbIngredient => {
        if (typeof ingredient !== 'object' || ingredient === null || Array.isArray(ingredient)) return false;
        const candidate = ingredient as Record<string, unknown>;
        const normalizedId = typeof candidate.idIngredient === 'string'
          ? candidate.idIngredient.trim()
          : '';
        const isValid =
          normalizedId.length > 0 &&
          typeof candidate.strIngredient === 'string' &&
          candidate.strIngredient.trim().length > 0 &&
          !seenIds.has(normalizedId);
        if (isValid) seenIds.add(normalizedId);
        return isValid;
      })
      .map((ingredient) => ({
        provider: 'themealdb' as const,
        id: ingredient.idIngredient.trim(),
        name: ingredient.strIngredient.trim(),
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
  },
};
