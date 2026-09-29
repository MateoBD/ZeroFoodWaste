import type { RecipeProvider } from '../recipeProvider';
import type { RecipeSummary } from '../recipe';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

function buildFilterByIngredientUrl(ingredient: string): string {
  const encodedIngredient = encodeURIComponent(ingredient);
  return `${BASE_URL}/filter.php?i=${encodedIngredient}`;
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