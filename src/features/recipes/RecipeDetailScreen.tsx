import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useRecipeDetail } from './useRecipeDetail';

type RecipeDetailScreenProps = {
  mealId: string;
};

/**
 * Displays the ingredients and cooking instructions for a selected recipe.
 *
 * @param props - The selected TheMealDB recipe identifier.
 * @returns The recipe-detail screen or an appropriate request state.
 */
export function RecipeDetailScreen({ mealId }: RecipeDetailScreenProps) {
  const { item, status } = useRecipeDetail(mealId);
  const t = useMessages();
  const { colors } = useTheme();

  if (status === 'loading') {
    return <RecipeState message={t('recipeLoading')} />;
  }

  if (status === 'error') {
    return <RecipeState message={t('recipeLoadError')} variant="error" />;
  }

  if (!item) {
    return <RecipeState message={t('recipeNotFound')} />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <AppText accessibilityRole="header" variant="title">{item.name}</AppText>
      {item.imageUrl ? <Image accessibilityIgnoresInvertColors source={{ uri: item.imageUrl }} style={styles.image} /> : null}
      <Surface style={styles.section}>
        <AppText variant="title">{t('ingredientsTitle')}</AppText>
        {item.ingredients.map((ingredient) => (
          <AppText key={`${ingredient.name}-${ingredient.measure ?? ''}`}>
            {ingredient.measure ? `${ingredient.measure} ${ingredient.name}` : ingredient.name}
          </AppText>
        ))}
      </Surface>
      <Surface style={styles.section}>
        <AppText variant="title">{t('instructionsTitle')}</AppText>
        <AppText>{item.instructions}</AppText>
      </Surface>
    </ScrollView>
  );
}

type RecipeStateProps = {
  message: string;
  variant?: 'body' | 'error';
};

/**
 * Displays a loading, unavailable, or missing-recipe state.
 *
 * @param props - The message and optional visual variant to display.
 * @returns The request-state view.
 */
function RecipeState({ message, variant = 'body' }: RecipeStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.state, { backgroundColor: colors.background }]}>
      <AppText variant={variant}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  image: { width: '100%', height: 240, borderRadius: 12 },
  section: { gap: spacing.sm },
  state: { flex: 1, padding: spacing.md, justifyContent: 'center' },
});
