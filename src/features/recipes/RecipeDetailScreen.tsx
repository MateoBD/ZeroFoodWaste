import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { ExpirationBadge } from '@/features/pantry/ExpirationBadge';
import { usePantry } from '@/features/pantry/PantryContext';
import type { PantryItem } from '@/features/pantry/pantryItem';
import { normalizeIngredientQuery } from './ingredientMatcher';

import { localDateToCalendarDate } from '@/features/pantry/calendarDate';
import { matchRecipe } from './recommendations/matching';
import { preparePantry } from './recommendations/preparation';
import { useRecipeDetail } from './useRecipeDetail';

type RecipeDetailScreenProps = {
  mealId: string;
  pantryItems?: readonly PantryItem[];
};

/**
 * Displays the ingredients and cooking instructions for a selected recipe.
 *
 * @param props - The selected TheMealDB recipe identifier.
 * @returns The recipe-detail screen or an appropriate request state.
 */
export function RecipeDetailScreen({ mealId, pantryItems = [] }: RecipeDetailScreenProps) {
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

  const [year, month, date] = localDateToCalendarDate(new Date()).split('-').map(Number);
  const matching = matchRecipe(item, preparePantry(pantryItems, new Date(year, month - 1, date, 12)));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <AppText accessibilityRole="header" variant="title">{item.name}</AppText>
      {item.imageUrl ? (
        <Image
          accessibilityLabel={item.name}
          cachePolicy="memory-disk"
          contentFit="cover"
          source={item.imageUrl}
          style={styles.image}
          transition={150}
        />
      ) : null}
      <Surface style={styles.section}>
        <AppText variant="title">{t('ingredientsTitle')}</AppText>
        {item.ingredients.map((ingredient) => {
          const matches = matching.matches.find((match) => normalizeIngredientQuery(match.ingredient.name) === normalizeIngredientQuery(ingredient.name))?.packages ?? [];
          return (
            <View key={`${ingredient.name}-${ingredient.measure ?? ''}`} style={styles.ingredient}>
              <AppText>
                {ingredient.measure ? `${ingredient.measure} ${ingredient.name}` : ingredient.name}
              </AppText>
              {matches.length > 0 ? (
                <View style={styles.pantryMatches}>
                  {matches.map((match) => (
                    <View
                      key={match.id}
                      style={[styles.pantryMatch, { backgroundColor: colors.surface, borderColor: colors.accent }]}
                    >
                      <AppText style={{ color: colors.accent, fontWeight: '700' }}>{match.foodName}</AppText>
                      <ExpirationBadge expirationDate={match.expirationDate} />
                    </View>
                  ))}
                </View>
              ) : <AppText variant="muted">{t('missingIngredients')}</AppText>}
            </View>
          );
        })}
      </Surface>
      <AppText variant="muted">{matching.missing.length ? t('ingredientPresenceNotice') : t('allIngredientsMatched')}</AppText>
      <Surface style={styles.section}>
        <AppText variant="title">{t('instructionsTitle')}</AppText>
        <AppText>{item.instructions}</AppText>
      </Surface>
    </ScrollView>
  );
}

/**
 * Connects recipe details to the shared pantry for ingredient highlighting.
 *
 * @param props - The selected recipe identifier.
 * @returns The recipe detail screen with pantry matches.
 */
export function ConnectedRecipeDetailScreen({ mealId }: { mealId: string }) {
  const pantry = usePantry();
  return <RecipeDetailScreen mealId={mealId} pantryItems={pantry.items} />;
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
  ingredient: { gap: spacing.xs, paddingVertical: spacing.xs },
  pantryMatches: { gap: spacing.xs },
  pantryMatch: {
    alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: 10, borderCurve: 'continuous', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  state: { flex: 1, padding: spacing.md, justifyContent: 'center' },
});
