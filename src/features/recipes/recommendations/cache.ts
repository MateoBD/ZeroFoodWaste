import type { RecipeProvider } from '../recipeProvider';
import type { RecipeDetail, RecipeSummary } from '../recipe';

const TTL_MS = 15 * 60 * 1000;

/** Caches successful provider responses and shares concurrent requests. */
export class RecipeRequestCache {
  private searches = new Map<string, { value: RecipeSummary[]; expires: number }>();
  private details = new Map<string, { value: RecipeDetail; expires: number }>();
  private pendingSearches = new Map<string, Promise<RecipeSummary[]>>();
  private pendingDetails = new Map<string, Promise<RecipeDetail | null>>();

  /** @param provider - Typed recipe provider. @param now - Clock for cache expiry. */
  constructor(private provider: RecipeProvider, private now: () => number = Date.now) {}

  /** Clears successful and pending entries, primarily for isolated provider sessions. */
  clear(): void {
    this.searches.clear(); this.details.clear(); this.pendingSearches.clear(); this.pendingDetails.clear();
  }

  /**
   * Seeds verified details restored from device storage.
   * @param details - Successful complete recipes to reuse for navigation and refreshes.
   * @param expires - Epoch time at which the in-memory entries expire.
   */
  primeDetails(details: readonly RecipeDetail[], expires: number): void {
    for (const detail of details) this.details.set(detail.id, { value: detail, expires });
  }

  /** @param name - One ingredient name. @returns Cached or newly searched recipes. @throws On provider failure. */
  search(name: string): Promise<RecipeSummary[]> {
    const cached = this.searches.get(name);
    if (cached && cached.expires > this.now()) return Promise.resolve(cached.value);
    const pending = this.pendingSearches.get(name);
    if (pending) return pending;
    const request = this.provider.searchByIngredient(name).then((value) => {
      this.searches.set(name, { value, expires: this.now() + TTL_MS });
      return value;
    }).finally(() => this.pendingSearches.delete(name));
    this.pendingSearches.set(name, request);
    return request;
  }

  /** @param id - Provider recipe ID. @returns Cached or newly loaded details. @throws On provider failure. */
  detail(id: string): Promise<RecipeDetail | null> {
    const cached = this.details.get(id);
    if (cached && cached.expires > this.now()) return Promise.resolve(cached.value);
    const pending = this.pendingDetails.get(id);
    if (pending) return pending;
    const request = this.provider.getById(id).then((value) => {
      if (value) this.details.set(id, { value, expires: this.now() + TTL_MS });
      return value;
    }).finally(() => this.pendingDetails.delete(id));
    this.pendingDetails.set(id, request);
    return request;
  }
}
