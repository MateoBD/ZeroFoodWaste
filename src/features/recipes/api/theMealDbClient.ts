import type { IngredientCatalogProvider } from '../ingredientProvider';
import type { IngredientCatalogEntry } from '../ingredient';
import type { RecipeProvider } from '../recipeProvider';
import type { RecipeSummary } from '../recipe';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

function buildFilterByIngredientUrl(ingredient: string): string {
  const encodedIngredient = encodeURIComponent(ingredient);
  return `${BASE_URL}/filter.php?i=${encodedIngredient}`;
}

function buildIngredientListUrl(): string {
  return `${BASE_URL}/list.php?i=list`;
}

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

type TheMealDbMealSummary = {
    idMeal: string;
    strMeal: string;
    strMealThumb: string | null;
    strArea: string | null;
    strCountry: string | null;
};

type TheMealDbIngredient = {
  idIngredient: string;
  strIngredient: string;
};
  
function toRecipeSummary(meal: TheMealDbMealSummary): RecipeSummary {
    return {
      id: meal.idMeal,
      name: meal.strMeal,
      imageUrl: meal.strMealThumb,
      provider: 'themealdb',
    };
}

export const theMealDbRecipeProvider: RecipeProvider = {
    searchByIngredient(ingredient) {
      return fetchMealsByIngredient(ingredient);
    },
    getById() {
      return Promise.reject(new Error('Not implemented yet'));
  },
};

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
