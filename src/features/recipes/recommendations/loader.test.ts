import type { RecipeDetail, RecipeSummary } from '../recipe';
import type { RecipeProvider } from '../recipeProvider';
import { RecipeRequestCache } from './cache';
import { loadRecommendations } from './loader';
import type { SearchIngredient } from './types';

const summary = (id: string): RecipeSummary => ({ id, name: id, imageUrl: null, provider: 'themealdb' });
const detail = (id: string): RecipeDetail => ({ ...summary(id), ingredients: [{ name: 'Chicken', measure: null }], instructions: '', sourceUrl: null });
const searches: SearchIngredient[] = ['Chicken', 'Rice', 'Milk', 'Egg'].map((name) => ({ name, key: name.toLowerCase(), packages: [] }));

describe('recommendation loading and cache', () => {
  it('deduplicates searches and details and caches only successful responses for 15 minutes', async () => {
    let now = 0;
    const provider: RecipeProvider = { searchByIngredient: jest.fn(async () => [summary('one')]), getById: jest.fn(async () => detail('one')) };
    const cache = new RecipeRequestCache(provider, () => now);
    await Promise.all([cache.search('Chicken'), cache.search('Chicken')]);
    await Promise.all([cache.detail('one'), cache.detail('one')]);
    expect(provider.searchByIngredient).toHaveBeenCalledTimes(1);
    expect(provider.getById).toHaveBeenCalledTimes(1);
    await cache.search('Chicken'); await cache.detail('one');
    expect(provider.searchByIngredient).toHaveBeenCalledTimes(1);
    now = 900_001;
    await cache.search('Chicken'); await cache.detail('one');
    expect(provider.searchByIngredient).toHaveBeenCalledTimes(2);
    expect(provider.getById).toHaveBeenCalledTimes(2);
  });

  it('limits concurrency, retains partial details, and retries failed work', async () => {
    let active = 0; let maximum = 0; let fail = true;
    const provider: RecipeProvider = {
      searchByIngredient: jest.fn(async (name) => {
        active += 1; maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 1)); active -= 1;
        if (name === 'Milk' && fail) throw new Error('offline');
        return [summary(name === 'Rice' ? 'shared' : name), summary('shared')];
      }),
      getById: jest.fn(async (id) => { active += 1; maximum = Math.max(maximum, active); await new Promise((resolve) => setTimeout(resolve, 1)); active -= 1; return detail(id); }),
    };
    const cache = new RecipeRequestCache(provider);
    const first = await loadRecommendations(searches, cache, () => true, () => {});
    expect(maximum).toBeLessThanOrEqual(3);
    expect(first?.failures).toBe(1);
    expect(first?.details).toHaveLength(3);
    expect(first?.successfulSearchKeys).toEqual(['chicken', 'rice', 'egg']);
    expect(provider.getById).toHaveBeenCalledTimes(3);
    fail = false;
    const second = await loadRecommendations(searches, cache, () => true, () => {});
    expect(second?.failures).toBe(0);
    expect(second?.details).toHaveLength(4);
    expect(second?.successfulSearchKeys).toHaveLength(4);
    expect(second?.successfulSearchKeys).toEqual(expect.arrayContaining(['chicken', 'rice', 'milk', 'egg']));
    expect(provider.searchByIngredient).toHaveBeenCalledTimes(5);
  });

  it('distinguishes empty responses, unavailable details, and total failure', async () => {
    const empty = new RecipeRequestCache({ searchByIngredient: async () => [], getById: async () => null });
    expect(await loadRecommendations(searches.slice(0, 1), empty, () => true, () => {})).toMatchObject({ candidates: 0, failures: 0, details: [] });
    const unavailable = new RecipeRequestCache({ searchByIngredient: async () => [summary('x')], getById: async () => null });
    expect(await loadRecommendations(searches.slice(0, 1), unavailable, () => true, () => {})).toMatchObject({ candidates: 1, failures: 1, details: [] });
    const failed = new RecipeRequestCache({ searchByIngredient: async () => { throw new Error('offline'); }, getById: async () => null });
    expect(await loadRecommendations(searches.slice(0, 1), failed, () => true, () => {})).toMatchObject({ failures: 1, details: [] });
  });

  it('stops scheduling work after a load becomes obsolete', async () => {
    let current = true;
    const provider: RecipeProvider = { searchByIngredient: jest.fn(async () => { current = false; return [summary('x')]; }), getById: jest.fn(async () => detail('x')) };
    const progress = jest.fn();
    expect(await loadRecommendations(searches, new RecipeRequestCache(provider), () => current, progress)).toBeNull();
    expect(provider.searchByIngredient).toHaveBeenCalledTimes(1);
    expect(provider.getById).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
  });
});
