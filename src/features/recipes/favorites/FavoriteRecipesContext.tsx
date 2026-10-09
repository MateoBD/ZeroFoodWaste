import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { RecipeSummary } from '../recipe';
import { favoriteRecipeStorage } from './favoriteRecipeStorage';

type FavoriteRecipesContextValue = Readonly<{
  favorites: readonly RecipeSummary[];
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipe: RecipeSummary) => void;
}>;

const FavoriteRecipesContext = createContext<FavoriteRecipesContextValue | null>(null);

/**
 * Owns the device-local favorite recipes for the whole route tree.
 *
 * Toggling is ignored until saved favorites have loaded so they are never overwritten.
 * @param props - Routes that read or change favorites.
 * @returns Shared favorite-recipe state.
 */
export function FavoriteRecipesProvider({ children }: PropsWithChildren) {
  const [favorites, setFavorites] = useState<readonly RecipeSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    favoriteRecipeStorage.load().then(
      (saved) => { if (active) setFavorites(saved); },
      () => { if (active) setFavorites([]); },
    );
    return () => { active = false; };
  }, []);

  const toggleFavorite = useCallback((recipe: RecipeSummary) => {
    if (!favorites) return;
    const { id, name, imageUrl, provider } = recipe;
    const next = favorites.some((favorite) => favorite.id === id)
      ? favorites.filter((favorite) => favorite.id !== id)
      : [{ id, name, imageUrl, provider }, ...favorites];
    setFavorites(next);
    void favoriteRecipeStorage.save(next).catch(() => {});
  }, [favorites]);

  const value = useMemo<FavoriteRecipesContextValue>(() => ({
    favorites: favorites ?? [],
    isFavorite: (recipeId) => favorites?.some((favorite) => favorite.id === recipeId) ?? false,
    toggleFavorite,
  }), [favorites, toggleFavorite]);
  return <FavoriteRecipesContext.Provider value={value}>{children}</FavoriteRecipesContext.Provider>;
}

/** @returns Favorite recipes and the toggle action. @throws Outside FavoriteRecipesProvider. */
export function useFavoriteRecipes(): FavoriteRecipesContextValue {
  const value = useContext(FavoriteRecipesContext);
  if (!value) throw new Error('useFavoriteRecipes must be used inside FavoriteRecipesProvider');
  return value;
}
