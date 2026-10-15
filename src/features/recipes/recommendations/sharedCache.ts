import { theMealDbRecipeProvider } from '../api/theMealDbClient';
import { RecipeRequestCache } from './cache';

/** Shared successful provider responses for recommendations and detail navigation. */
export const recipeRequestCache = new RecipeRequestCache(theMealDbRecipeProvider);
