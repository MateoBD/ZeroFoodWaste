/**
 * TheMealDB adapter scaffold. No network client is exported yet.
 *
 * Planned v1 flow:
 * 1. URL-encode one ingredient and request `filter.php?i=<ingredient>` for
 *    meal IDs, names, and thumbnails.
 * 2. URL-encode a selected meal ID and request `lookup.php?i=<mealId>` for
 *    ingredients, instructions, and other full recipe details.
 *
 * Base URL: https://www.themealdb.com/api/json/v1/1/
 * The free key `1` is for development; confirm production access before
 * enabling requests in a shipped app.
 *
 * A future implementation will satisfy RecipeProvider, distinguish empty
 * results from failures, and keep failures isolated from pantry operations.
 */
export {};
