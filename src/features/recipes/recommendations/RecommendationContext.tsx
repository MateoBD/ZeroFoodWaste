import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { localDateToCalendarDate } from '@/features/pantry/calendarDate';
import { usePantry } from '@/features/pantry/PantryContext';
import type { RecipeDetail } from '../recipe';
import { recommendRecipes } from './engine';
import { loadRecommendations } from './loader';
import { preparePantry } from './preparation';
import { recipeRequestCache } from './sharedCache';
import {
  RECOMMENDATION_MAX_AGE_MS,
  recommendationStorage,
  type RecommendationCache,
} from './storage';

type RecommendationState = Readonly<{
  cache: RecommendationCache | null;
  loaded: boolean;
  refreshing: boolean;
  failureNoticeId: number | null;
}>;

type RecommendationContextValue = Readonly<{
  items: ReturnType<typeof recommendRecipes>;
  eligibleItems: ReturnType<typeof preparePantry>['searches'];
  status: 'idle' | 'loading' | 'ready' | 'error';
  refreshing: boolean;
  failureNoticeId: number | null;
  refresh: () => void;
  dismissFailureNotice: () => void;
}>;

const RecommendationContext = createContext<RecommendationContextValue | null>(null);

function localDay(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function mergeDetails(current: readonly RecipeDetail[], incoming: readonly RecipeDetail[]): RecipeDetail[] {
  const merged = new Map(current.map((detail) => [`${detail.provider}:${detail.id}`, detail]));
  for (const detail of incoming) merged.set(`${detail.provider}:${detail.id}`, detail);
  return [...merged.values()];
}

/**
 * Owns saved, preloaded recipe recommendations for the whole route tree.
 *
 * Saved recipes render immediately. Stale or newly needed ingredients refresh
 * in the background while pantry changes are ranked locally.
 * @param props - Routes that consume recommendations.
 * @returns Shared recommendation state.
 */
export function RecommendationProvider({ children }: PropsWithChildren) {
  const pantry = usePantry();
  const [day, setDay] = useState(() => localDateToCalendarDate(new Date()));
  const [refreshCheck, setRefreshCheck] = useState(0);
  const [state, setState] = useState<RecommendationState>({
    cache: null, loaded: false, refreshing: false, failureNoticeId: null,
  });
  const requestSequence = useRef(0);
  const attemptedIngredientKeys = useRef(new Set<string>());
  const now = useMemo(() => localDay(day), [day]);
  const prepared = useMemo(() => preparePantry(pantry.items, now), [pantry.items, now]);
  const items = useMemo(
    () => recommendRecipes(pantry.items, state.cache?.details ?? [], now),
    [pantry.items, state.cache?.details, now],
  );

  useEffect(() => {
    let active = true;
    recommendationStorage.load().then((saved) => {
      if (!active) return;
      if (saved) {
        recipeRequestCache.primeDetails(
          saved.details,
          new Date(saved.fetchedAt).getTime() + RECOMMENDATION_MAX_AGE_MS,
        );
      }
      setState((current) => ({ ...current, cache: saved, loaded: true }));
    }, () => {
      if (active) setState((current) => ({ ...current, loaded: true }));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateDay = () => setDay(localDateToCalendarDate(new Date()));
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        updateDay();
        setRefreshCheck((value) => value + 1);
      }
    });
    const timer = setInterval(() => {
      updateDay();
      setRefreshCheck((value) => value + 1);
    }, 60_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  const runRefresh = useCallback((force: boolean) => {
    if (!state.loaded || pantry.status !== 'ready' || state.refreshing || prepared.searches.length === 0) return;
    const searched = new Set(state.cache?.searchedIngredients ?? []);
    const stale = !state.cache || Date.now() - new Date(state.cache.fetchedAt).getTime() >= RECOMMENDATION_MAX_AGE_MS;
    const searches = force || stale ? prepared.searches : prepared.searches.filter((search) => (
      !searched.has(search.key) && !attemptedIngredientKeys.current.has(search.key)
    ));
    if (searches.length === 0) return;
    if (force) recipeRequestCache.clear();
    for (const search of searches) attemptedIngredientKeys.current.add(search.key);
    const requestId = ++requestSequence.current;
    setState((current) => ({ ...current, refreshing: true, failureNoticeId: null }));
    void loadRecommendations(searches, recipeRequestCache, () => requestSequence.current === requestId, (progress) => {
      if (requestSequence.current !== requestId) return;
      setState((current) => {
        const cache: RecommendationCache = {
          fetchedAt: progress.pending ? current.cache?.fetchedAt ?? new Date().toISOString() : new Date().toISOString(),
          searchedIngredients: [...new Set([
            ...(current.cache?.searchedIngredients ?? []), ...progress.successfulSearchKeys,
          ])],
          details: mergeDetails(current.cache?.details ?? [], progress.details),
        };
        if (!progress.pending) void recommendationStorage.save(cache).catch(() => {});
        return {
          cache,
          loaded: true,
          refreshing: progress.pending,
          failureNoticeId: !progress.pending && progress.failures > 0 ? requestId : current.failureNoticeId,
        };
      });
    });
  }, [pantry.status, prepared.searches, state.cache, state.loaded, state.refreshing]);

  useEffect(() => {
    if (!state.loaded || state.refreshing) return;
    runRefresh(false);
  }, [refreshCheck, runRefresh, state.loaded, state.refreshing]);

  const refresh = useCallback(() => runRefresh(true), [runRefresh]);
  const dismissFailureNotice = useCallback(() => {
    setState((current) => ({ ...current, failureNoticeId: null }));
  }, []);
  const status = !state.loaded || (state.refreshing && !state.cache?.details.length)
    ? 'loading' : items.length ? 'ready' : state.failureNoticeId ? 'error' : 'idle';
  const value = useMemo<RecommendationContextValue>(() => ({
    items, eligibleItems: prepared.searches, status, refreshing: state.refreshing,
    failureNoticeId: state.failureNoticeId, refresh, dismissFailureNotice,
  }), [dismissFailureNotice, items, prepared.searches, refresh, state.failureNoticeId, state.refreshing, status]);
  return <RecommendationContext.Provider value={value}>{children}</RecommendationContext.Provider>;
}

/** @returns Shared recommendation results and refresh actions. @throws Outside RecommendationProvider. */
export function useRecommendations(): RecommendationContextValue {
  const value = useContext(RecommendationContext);
  if (!value) throw new Error('useRecommendations must be used inside RecommendationProvider');
  return value;
}
