import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { TimedNotice } from '@/components/ui/TimedNotice';
import { ExpirationBadge } from '@/features/pantry/ExpirationBadge';
import { usePantry } from '@/features/pantry/PantryContext';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { normalizeIngredientQuery } from './ingredientMatcher';
import type { Recommendation, SearchIngredient } from './recommendations/types';
import { useRecommendations } from './recommendations/RecommendationContext';

type RecipeSuggestionsScreenProps = Readonly<{ initialIngredient?: string }>;

function recipeKey(item: Recommendation) {
  return `${item.recipe.provider}:${item.recipe.id}`;
}

function ingredientKey(item: SearchIngredient) {
  return item.key;
}

function IngredientSeparator() {
  return <View style={styles.ingredientSeparator} />;
}

/**
 * Displays automatic recipe suggestions for the pantry foods that need attention.
 *
 * @param props - Optional linked ingredient selected from pantry details.
 * @returns The recipe suggestions tab screen.
 */
export function RecipeSuggestionsScreen({ initialIngredient }: RecipeSuggestionsScreenProps) {
  const pantry = usePantry();
  const [query, setQuery] = useState(initialIngredient ?? '');
  const [selectedIngredient, setSelectedIngredient] = useState(initialIngredient ?? '');
  const {
    eligibleItems, items, status, refreshing, failureNoticeId,
    refresh, dismissFailureNotice,
  } = useRecommendations();
  const t = useMessages();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const uniqueIngredients = eligibleItems;
  const normalizedQuery = normalizeIngredientQuery(query);
  const visibleIngredients = useMemo(() => uniqueIngredients.filter((item) =>
    !normalizedQuery || normalizeIngredientQuery(item.name).includes(normalizedQuery),
  ), [normalizedQuery, uniqueIngredients]);
  const activeSelection = uniqueIngredients.some((item) => item.name === selectedIngredient)
    ? selectedIngredient : '';
  const visibleRecipes = useMemo(() => activeSelection
    ? items.filter((item) => item.matches.some((match) => match.ingredient.name === activeSelection))
    : items,
  [activeSelection, items]);

  const handleRecipePress = useCallback((recipeId: string, ingredientName: string) => {
    router.push({
      pathname: '/recipes/[ingredient]/[mealId]' as never,
      params: { ingredient: ingredientName, mealId: recipeId },
    });
  }, []);

  const handleIngredientSelect = useCallback((ingredient: string) => {
    if (ingredient === activeSelection) {
      setSelectedIngredient('');
      setQuery('');
      return;
    }
    setSelectedIngredient(ingredient);
    setQuery(ingredient);
  }, [activeSelection]);

  const renderRecipe = useCallback(({ item }: ListRenderItemInfo<Recommendation>) => (
    <RecipeSuggestionCard item={item} onPress={handleRecipePress} />
  ), [handleRecipePress]);

  const renderIngredient = useCallback(({ item }: ListRenderItemInfo<SearchIngredient>) => (
    <IngredientFilter
      item={item}
      isSelected={activeSelection === item.name}
      onSelect={handleIngredientSelect}
    />
  ), [activeSelection, handleIngredientSelect]);

  const emptyMessage = pantry.status === 'loading'
    ? t('pantryLoading')
    : pantry.status === 'error'
      ? t('pantryLoadError')
      : pantry.items.length === 0
        ? t('recipePantryEmpty')
        : eligibleItems.length === 0
          ? t('recipeNoEligibleFoods')
          : status === 'error'
            ? t('recipesLoadError')
            : status === 'loading'
              ? t('recipesLoading')
              : activeSelection ? t('recipesEmptySelected') : t('recipesEmptyEligible');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        key={activeSelection || 'all-recipes'}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={visibleRecipes}
        keyExtractor={recipeKey}
        testID="recipe-suggestions-list"
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText accessibilityRole="header" variant="title">{t('recipeSuggestionsTitle')}</AppText>
            <AppText variant="muted">{t('recipeSuggestionsSubtitle')}</AppText>
            <TextInput
              accessibilityLabel={t('recipeIngredientFilter')}
              onChangeText={(value) => {
                setQuery(value);
                if (normalizeIngredientQuery(value) !== normalizeIngredientQuery(activeSelection)) {
                  setSelectedIngredient('');
                }
              }}
              placeholder={t('recipeIngredientFilterPlaceholder')}
              placeholderTextColor={colors.mutedText}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={query}
            />
            {visibleIngredients.length > 0 ? (
              <FlashList
                contentContainerStyle={styles.filters}
                data={visibleIngredients}
                horizontal
                ItemSeparatorComponent={IngredientSeparator}
                keyExtractor={ingredientKey}
                renderItem={renderIngredient}
                showsHorizontalScrollIndicator={false}
                style={styles.filterList}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant={status === 'error' || pantry.status === 'error' ? 'error' : 'body'}>
              {emptyMessage}
            </AppText>
            {status === 'error' ? (
              <Button onPress={refresh}>
                <ButtonText>{t('retry')}</ButtonText>
              </Button>
            ) : null}
          </View>
        }
        onRefresh={refresh}
        refreshing={refreshing}
        renderItem={renderRecipe}
      />
      {failureNoticeId !== null ? (
        <TimedNotice
          key={failureNoticeId}
          actionLabel={t('retry')}
          bottom={insets.bottom + 72}
          message={t('recipesPartialError')}
          onAction={refresh}
          onDismiss={dismissFailureNotice}
        />
      ) : null}
    </View>
  );
}

type IngredientFilterProps = Readonly<{
  item: SearchIngredient;
  isSelected: boolean;
  onSelect: (ingredientName: string) => void;
}>;

const IngredientFilter = memo(function IngredientFilter({ item, isSelected, onSelect }: IngredientFilterProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(item.name)}
      testID={`recipe-ingredient-filter-${item.key}`}
      style={[
        styles.filter,
        { backgroundColor: isSelected ? colors.accent : colors.surface, borderColor: colors.border },
      ]}
    >
      <AppText
        ellipsizeMode="tail"
        numberOfLines={1}
        style={[styles.filterText, { color: isSelected ? colors.accentText : colors.text }]}
      >
        {item.name.replace(/\s+/g, ' ')}
      </AppText>
    </Pressable>
  );
});

type RecipeSuggestionCardProps = Readonly<{
  item: Recommendation;
  onPress: (recipeId: string, ingredientName: string) => void;
}>;

const RecipeSuggestionCard = memo(function RecipeSuggestionCard({ item, onPress }: RecipeSuggestionCardProps) {
  const t = useMessages();
  return (
    <Pressable
      accessibilityLabel={item.recipe.name}
      accessibilityRole="button"
      onPress={() => onPress(item.recipe.id, item.matches[0]?.ingredient.name ?? '')}
      style={styles.cardPressable}
    >
      <Surface style={styles.card}>
        {item.recipe.imageUrl ? (
          <Image
            accessibilityLabel={item.recipe.name}
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={item.recipe.id}
            source={item.recipe.imageUrl}
            style={styles.image}
            transition={150}
          />
        ) : null}
        <AppText style={styles.recipeName}>{item.recipe.name}</AppText>
        <AppText variant="muted">{`${item.score.totalMatchCount}/${item.score.totalMatchCount + item.missing.length} ${t('ingredientsMatched')}`}</AppText>
        <AppText variant="muted">{`${item.score.priorityMatchCount} ${t('priorityMatches')}`}</AppText>
        <AppText variant="muted">{t('ingredientPresenceNotice')}</AppText>
        <View style={styles.matches}>
          {item.matches.flatMap((match) => match.packages.map((pkg) => (
            <View key={`${match.ingredient.name}:${pkg.id}`} style={styles.match}>
              <AppText>{pkg.foodName}</AppText>
              <ExpirationBadge expirationDate={pkg.expirationDate} />
            </View>
          )))}
        </View>
        <AppText variant="muted">{item.missing.length ? `${t('missingIngredients')}: ${item.missing.map((ingredient) => ingredient.name).join(', ')}` : t('allIngredientsMatched')}</AppText>
        <AppText variant="muted">{t('recipeSource')}</AppText>
        <AppText variant="muted">{t('viewRecipe')}</AppText>
      </Surface>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  input: {
    minHeight: 48, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous',
    paddingHorizontal: spacing.md, fontSize: 16,
  },
  filterList: { height: 48 },
  filters: { paddingHorizontal: spacing.xs },
  ingredientSeparator: { width: spacing.sm },
  filter: {
    minHeight: 48, maxWidth: 260, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderWidth: 1, borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden',
  },
  filterText: { flexShrink: 1 },
  empty: { paddingVertical: spacing.xl, gap: spacing.md },
  cardPressable: { marginBottom: spacing.md },
  card: { gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: 12, borderCurve: 'continuous' },
  recipeName: { fontSize: 18, fontWeight: '700' },
  matches: { gap: spacing.sm },
  match: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
