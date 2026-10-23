import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { RecipeSummary } from '../recipe';
import { RecipeResultCard } from '../RecipeResultsScreen';
import { useFavoriteRecipes } from './FavoriteRecipesContext';

function recipeKey(item: RecipeSummary) {
  return item.id;
}

/**
 * Displays the recipes the user saved as favorites.
 *
 * @returns The favorite recipes tab screen.
 */
export function FavoriteRecipesScreen() {
  const router = useRouter();
  const { favorites } = useFavoriteRecipes();
  const t = useMessages();
  const { colors } = useTheme();

  /**
   * Opens the full recipe selected from the favorites list.
   *
   * @param recipe - The summary of the recipe to display.
   */
  function handleRecipePress(recipe: RecipeSummary) {
    router.push({
      pathname: '/recipes/[ingredient]/[mealId]' as never,
      params: { ingredient: 'favorites', mealId: recipe.id },
    });
  }

  function renderRecipe({ item }: ListRenderItemInfo<RecipeSummary>) {
    return (
      <View style={styles.card}>
        <RecipeResultCard recipe={item} onPress={handleRecipePress} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={favorites}
        keyExtractor={recipeKey}
        ListHeaderComponent={
          <AppText accessibilityRole="header" style={styles.header} variant="title">
            {t('favoriteRecipesTitle')}
          </AppText>
        }
        ListEmptyComponent={<AppText>{t('favoriteRecipesEmpty')}</AppText>}
        renderItem={renderRecipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { paddingBottom: spacing.md },
  card: { marginBottom: spacing.md },
});
