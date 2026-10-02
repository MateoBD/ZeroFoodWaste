import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { ExpirationBadge } from '@/features/pantry/ExpirationBadge';
import { usePantry } from '@/features/pantry/PantryContext';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { normalizeIngredientQuery } from './ingredientMatcher';
import type { EligiblePantryItem, RecipeSuggestion } from './recipeSuggestions';
import { useRecipeSuggestions } from './useRecipeSuggestions';

type RecipeSuggestionsScreenProps = Readonly<{ initialIngredient?: string }>;

function recipeKey(item: RecipeSuggestion) {
  return item.recipe.id;
}

function ingredientKey(item: EligiblePantryItem) {
  return item.id;
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
  const [retryToken, setRetryToken] = useState(0);
  const [query, setQuery] = useState(initialIngredient ?? '');
  const [selectedIngredient, setSelectedIngredient] = useState(initialIngredient ?? '');
  const { eligibleItems, items, status } = useRecipeSuggestions(pantry.items, retryToken);
  const t = useMessages();
  const { colors } = useTheme();

  const uniqueIngredients = useMemo(() => eligibleItems.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.ingredientName === item.ingredientName) === index,
  ), [eligibleItems]);
  const normalizedQuery = normalizeIngredientQuery(query);
  const visibleIngredients = useMemo(() => uniqueIngredients.filter((item) =>
    !normalizedQuery || normalizeIngredientQuery(item.foodName).includes(normalizedQuery)
      || normalizeIngredientQuery(item.ingredientName).includes(normalizedQuery),
  ), [normalizedQuery, uniqueIngredients]);
  const activeSelection = uniqueIngredients.some((item) => item.ingredientName === selectedIngredient)
    ? selectedIngredient : '';
  const visibleRecipes = useMemo(() => activeSelection
    ? items.filter((item) => item.matches.some((match) => match.ingredientName === activeSelection))
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

  const renderRecipe = useCallback(({ item }: ListRenderItemInfo<RecipeSuggestion>) => (
    <RecipeSuggestionCard item={item} onPress={handleRecipePress} />
  ), [handleRecipePress]);

  const renderIngredient = useCallback(({ item }: ListRenderItemInfo<EligiblePantryItem>) => (
    <IngredientFilter
      item={item}
      isSelected={activeSelection === item.ingredientName}
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
            {status === 'partial' ? (
              <Surface style={styles.warning}>
                <AppText variant="error">{t('recipesPartialError')}</AppText>
                <Button onPress={() => setRetryToken((value) => value + 1)}>
                  <ButtonText>{t('retry')}</ButtonText>
                </Button>
              </Surface>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant={status === 'error' || pantry.status === 'error' ? 'error' : 'body'}>
              {emptyMessage}
            </AppText>
            {status === 'error' ? (
              <Button onPress={() => setRetryToken((value) => value + 1)}>
                <ButtonText>{t('retry')}</ButtonText>
              </Button>
            ) : null}
          </View>
        }
        renderItem={renderRecipe}
      />
    </View>
  );
}

type IngredientFilterProps = Readonly<{
  item: EligiblePantryItem;
  isSelected: boolean;
  onSelect: (ingredientName: string) => void;
}>;

const IngredientFilter = memo(function IngredientFilter({ item, isSelected, onSelect }: IngredientFilterProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(item.ingredientName)}
      testID={`recipe-ingredient-filter-${item.id}`}
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
        {item.foodName.replace(/\s+/g, ' ')}
      </AppText>
    </Pressable>
  );
});

type RecipeSuggestionCardProps = Readonly<{
  item: RecipeSuggestion;
  onPress: (recipeId: string, ingredientName: string) => void;
}>;

const RecipeSuggestionCard = memo(function RecipeSuggestionCard({ item, onPress }: RecipeSuggestionCardProps) {
  const t = useMessages();
  return (
    <Pressable
      accessibilityLabel={item.recipe.name}
      accessibilityRole="button"
      onPress={() => onPress(item.recipe.id, item.matches[0]?.ingredientName ?? '')}
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
        <AppText variant="muted">{t('usesPantryFoods')}</AppText>
        <View style={styles.matches}>
          {item.matches.map((match) => (
            <View key={match.id} style={styles.match}>
              <AppText>{match.foodName}</AppText>
              <ExpirationBadge expirationDate={match.expirationDate} />
            </View>
          ))}
        </View>
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
    height: 44, maxWidth: 260, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderWidth: 1, borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden',
  },
  filterText: { flexShrink: 1 },
  warning: { gap: spacing.sm },
  empty: { paddingVertical: spacing.xl, gap: spacing.md },
  cardPressable: { marginBottom: spacing.md },
  card: { gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: 12, borderCurve: 'continuous' },
  recipeName: { fontSize: 18, fontWeight: '700' },
  matches: { gap: spacing.sm },
  match: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
