import type { ExpirationUrgency } from '@/features/pantry/expirationUrgency';
import type { RecipeDetail, RecipeIngredient } from '../recipe';

/** A valid package used by the recommendation engine. */
export type PreparedPackage = Readonly<{ id: string; foodName: string; ingredientName: string; expirationDate: string; daysRemaining: number; urgency: ExpirationUrgency; priority: boolean }>;
/** A unique searchable pantry ingredient and its packages. */
export type SearchIngredient = Readonly<{ name: string; key: string; packages: readonly PreparedPackage[] }>;
/** Prepared pantry lookup data. */
export type PreparedPantry = Readonly<{ packages: readonly PreparedPackage[]; searches: readonly SearchIngredient[]; byIngredient: ReadonlyMap<string, readonly PreparedPackage[]> }>;
/** One distinct recipe ingredient verified against eligible packages. */
export type IngredientMatch = Readonly<{ ingredient: RecipeIngredient; packages: readonly PreparedPackage[] }>;
/** Explainable score used by cards and ranking. */
export type RecommendationScore = Readonly<{ priorityMatchCount: number; totalMatchCount: number; nearestExpirationDays: number }>;
/** A recipe with verified pantry presence and missing ingredient names. */
export type Recommendation = Readonly<{ recipe: RecipeDetail; matches: readonly IngredientMatch[]; missing: readonly RecipeIngredient[]; score: RecommendationScore }>;
