import type { RecipeDetail, RecipeSummary } from '../recipe';
import { RecipeRequestCache } from './cache';
import type { SearchIngredient } from './types';

/** State emitted while provider searches and details are processed. */
export type LoadProgress = Readonly<{
  details: readonly RecipeDetail[];
  failures: number;
  pending: boolean;
  searched: number;
  candidates: number;
  successfulSearchKeys: readonly string[];
}>;

/**
 * Searches every eligible ingredient, deduplicates candidates, then verifies details.
 *
 * At most three provider requests run together. Obsolete loads stop scheduling work.
 * @param searches - Prepared unique ingredient searches.
 * @param cache - Injected provider cache.
 * @param isCurrent - Whether this load still owns the screen.
 * @param onProgress - Receives progressive successful details and failures.
 * @returns Final progress when current, or null after cancellation.
 */
export async function loadRecommendations(searches: readonly SearchIngredient[], cache: RecipeRequestCache, isCurrent: () => boolean, onProgress: (progress: LoadProgress) => void): Promise<LoadProgress | null> {
  const details: RecipeDetail[] = [];
  let failures = 0;
  let searched = 0;
  let candidates = 0;
  let next = 0;
  const successfulSearchKeys = new Set<string>();
  const found = new Map<string, RecipeSummary>();
  const emit = (pending: boolean) => onProgress({
    details: [...details], failures, pending, searched, candidates,
    successfulSearchKeys: [...successfulSearchKeys],
  });
  async function run<T>(tasks: readonly T[], operation: (task: T) => Promise<void>) {
    next = 0;
    await Promise.all(Array.from({ length: Math.min(3, tasks.length) }, async () => {
      while (isCurrent() && next < tasks.length) {
        const task = tasks[next++];
        await operation(task);
      }
    }));
  }
  await run(searches, async (search) => {
    try {
      const recipes = await cache.search(search.name);
      if (!isCurrent()) return;
      successfulSearchKeys.add(search.key);
      for (const recipe of recipes) found.set(`${recipe.provider}:${recipe.id}`, recipe);
    } catch { failures += 1; }
    searched += 1;
    if (isCurrent()) emit(true);
  });
  if (!isCurrent()) return null;
  candidates = found.size;
  await run([...found.values()], async (summary) => {
    try {
      const detail = await cache.detail(summary.id);
      if (!isCurrent()) return;
      if (detail) details.push(detail);
      else failures += 1;
    } catch { failures += 1; }
    if (isCurrent()) emit(true);
  });
  if (!isCurrent()) return null;
  const result = {
    details: [...details], failures, pending: false, searched, candidates,
    successfulSearchKeys: [...successfulSearchKeys],
  };
  onProgress(result);
  return result;
}
