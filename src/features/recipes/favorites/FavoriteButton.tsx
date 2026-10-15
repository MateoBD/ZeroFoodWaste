import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { RecipeSummary } from '../recipe';
import { useFavoriteRecipes } from './FavoriteRecipesContext';

type FavoriteButtonProps = Readonly<{
  recipe: RecipeSummary;
  /** Floats the button over the top-right corner of its recipe card. */
  overlay?: boolean;
}>;

/**
 * Saves a recipe to favorites or removes it again.
 *
 * @param props - The recipe to toggle and the optional card overlay placement.
 * @returns A heart button reflecting whether the recipe is a favorite.
 */
export function FavoriteButton({ recipe, overlay = false }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoriteRecipes();
  const t = useMessages();
  const { colors } = useTheme();
  const favorite = isFavorite(recipe.id);

  return (
    <Pressable
      accessibilityLabel={`${favorite ? t('favoriteRemove') : t('favoriteAdd')}: ${recipe.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: favorite }}
      onPress={() => toggleFavorite(recipe)}
      style={[styles.button, overlay && [styles.overlay, { backgroundColor: colors.surface }]]}
    >
      <AppText accessible={false} style={[styles.icon, { color: colors.accent }]}>
        {favorite ? '♥' : '♡'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', top: spacing.md, right: spacing.md, borderRadius: 24 },
  icon: { fontSize: 28, lineHeight: 32 },
});
