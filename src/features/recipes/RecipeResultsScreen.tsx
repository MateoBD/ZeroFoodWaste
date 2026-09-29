import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { RecipeSummary } from './recipe';
import { useRecipeSearch } from './useRecipeSearch';

type RecipeResultsScreenProps = {
  ingredient: string;
};

/**
 * Displays recipes that contain the selected pantry ingredient.
 *
 * @param props - The ingredient used to search for recipe summaries.
 * @returns The recipe-search screen.
 */
export function RecipeResultsScreen({ ingredient }: RecipeResultsScreenProps) {
  const { items, status } = useRecipeSearch(ingredient);
  const t = useMessages();
  const { colors } = useTheme();

  /**
   * Opens the full recipe selected from this ingredient's results.
   *
   * @param recipe - The summary of the recipe to display.
   */
  function handleRecipePress(recipe: RecipeSummary) {
    router.push({
      pathname: '/recipes/[ingredient]/[mealId]' as never,
      params: { ingredient, mealId: recipe.id },
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <AppText accessibilityRole="header" variant="title">
        {t('recipeResultsTitle')}
      </AppText>
      <AppText variant="muted">{`${t('recipeResultsFor')}: ${ingredient}`}</AppText>
      {status === 'loading' ? <AppText>{t('recipesLoading')}</AppText> : null}
      {status === 'error' ? <AppText variant="error">{t('recipesLoadError')}</AppText> : null}
      {status === 'ready' && items.length === 0 ? <AppText>{t('recipesEmpty')}</AppText> : null}
      {items.map((recipe) => (
        <RecipeResultCard key={recipe.id} recipe={recipe} onPress={handleRecipePress} />
      ))}
    </ScrollView>
  );
}

type RecipeResultCardProps = {
  recipe: RecipeSummary;
  onPress: (recipe: RecipeSummary) => void;
};

/**
 * Renders one tappable recipe summary in an ingredient-search result list.
 *
 * @param props - The summary to render and its selection callback.
 * @returns A pressable recipe-result card.
 */
function RecipeResultCard({ recipe, onPress }: RecipeResultCardProps) {
  const t = useMessages();

  return (
    <Pressable
      accessibilityLabel={recipe.name}
      accessibilityRole="button"
      onPress={() => onPress(recipe)}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Surface style={styles.card}>
        {recipe.imageUrl ? <Image accessibilityIgnoresInvertColors source={{ uri: recipe.imageUrl }} style={styles.image} /> : null}
        <AppText style={styles.recipeName}>{recipe.name}</AppText>
        <AppText variant="muted">{t('viewRecipe')}</AppText>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  card: { gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: 10 },
  recipeName: { fontWeight: '700' },
});
