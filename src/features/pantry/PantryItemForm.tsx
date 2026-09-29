import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientCatalogEntry, IngredientReference } from '@/features/recipes/ingredient';
import { matchIngredients } from '@/features/recipes/ingredientMatcher';
import type { IngredientCatalogStatus } from '@/features/recipes/useIngredientCatalog';
import { isTodayOrFutureCalendarDate, isValidCalendarDate } from './calendarDate';
import { ExpirationDatePicker } from './ExpirationDatePicker';

/**
 * Highlights a literal substring match within an ingredient suggestion.
 *
 * @param name - The canonical ingredient name to display.
 * @param query - The text typed by the user.
 * @param highlightColor - The semantic color applied to the matching text.
 * @returns The plain name or a text fragment with the matched range highlighted.
 */
function renderHighlightedIngredientName(name: string, query: string, highlightColor: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchStart = name.toLocaleLowerCase().indexOf(normalizedQuery);

  if (!normalizedQuery || matchStart < 0) return name;

  const matchEnd = matchStart + normalizedQuery.length;
  return (
    <>
      {name.slice(0, matchStart)}
      <Text style={[styles.highlight, { color: highlightColor }]}>
        {name.slice(matchStart, matchEnd)}
      </Text>
      {name.slice(matchEnd)}
    </>
  );
}

type PantryItemFormProps = {
  initialName?: string;
  initialExpirationDate?: string;
  initialRecipeIngredient?: IngredientReference | null;
  ingredientCatalog: readonly IngredientCatalogEntry[];
  ingredientCatalogStatus: IngredientCatalogStatus;
  onCancel: () => void;
  onSave: (name: string, expirationDate: string, recipeIngredient: IngredientReference | null) => void;
};

/**
 * Collects a food name and package date with optional ingredient autocomplete.
 *
 * The form validates a non-empty name and a valid local YYYY-MM-DD date that
 * is today or later before calling the save callback.
 *
 * @param props - Initial values, catalogue state, and save or cancel callbacks.
 * @returns The add or edit form.
 */
export function PantryItemForm({
  initialName = '',
  initialExpirationDate = '',
  initialRecipeIngredient = null,
  ingredientCatalog,
  ingredientCatalogStatus,
  onCancel,
  onSave,
}: PantryItemFormProps) {
  const [nameDraft, setNameDraft] = useState(initialName);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientReference | null>(initialRecipeIngredient);
  const [expirationDateDraft, setExpirationDateDraft] = useState(initialExpirationDate);
  const [hasNameError, setHasNameError] = useState(false);
  const [expirationError, setExpirationError] = useState<'required' | 'invalid' | 'past' | null>(
    null,
  );
  const expirationInputRef = useRef<TextInput>(null);
  const t = useMessages();
  const { colors } = useTheme();
  const suggestions = useMemo(
    () => selectedIngredient ? [] : matchIngredients(nameDraft, ingredientCatalog),
    [ingredientCatalog, nameDraft, selectedIngredient],
  );

  function handleNameChange(value: string) {
    setNameDraft(value);
    setSelectedIngredient(null);
    if (hasNameError) {
      setHasNameError(false);
    }
  }

  function handleIngredientSelect(ingredient: IngredientReference) {
    setNameDraft(ingredient.name);
    setSelectedIngredient(ingredient);
    setHasNameError(false);
  }

  function handleExpirationChange(value: string) {
    setExpirationDateDraft(value);
    if (expirationError) {
      setExpirationError(null);
    }
  }

  function handleSubmit() {
    const trimmedName = nameDraft.trim();
    const trimmedExpiration = expirationDateDraft.trim();
    let isFormValid = true;

    if (!trimmedName) {
      setHasNameError(true);
      isFormValid = false;
    }

    if (!trimmedExpiration) {
      setExpirationError('required');
      isFormValid = false;
    } else if (!isValidCalendarDate(trimmedExpiration)) {
      setExpirationError('invalid');
      isFormValid = false;
    } else if (!isTodayOrFutureCalendarDate(trimmedExpiration)) {
      setExpirationError('past');
      isFormValid = false;
    }

    if (!isFormValid) {
      return;
    }

    setNameDraft('');
    setExpirationDateDraft('');
    setHasNameError(false);
    setExpirationError(null);
    onSave(trimmedName, trimmedExpiration, selectedIngredient);
  }

  return (
    <View style={styles.form}>
      <AppText nativeID="food-name-label">{t('foodNameLabel')}</AppText>
      <TextInput
        accessibilityLabel={t('foodNameLabel')}
        accessibilityLabelledBy="food-name-label"
        aria-invalid={hasNameError}
        autoCapitalize="sentences"
        onChangeText={handleNameChange}
        onSubmitEditing={() => expirationInputRef.current?.focus()}
        placeholder={t('foodNamePlaceholder')}
        placeholderTextColor={colors.mutedText}
        returnKeyType="next"
        submitBehavior="submit"
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: hasNameError ? colors.errorText : colors.border,
            color: colors.text,
          },
        ]}
        value={nameDraft}
      />
      {hasNameError ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('foodNameRequired')}
        </AppText>
      ) : null}
      {ingredientCatalogStatus === 'loading' && nameDraft.trim().length >= 2 && suggestions.length === 0 ? (
        <AppText variant="muted">{t('ingredientSuggestionsLoading')}</AppText>
      ) : null}
      {ingredientCatalogStatus === 'error' && nameDraft.trim().length >= 2 && suggestions.length === 0 ? (
        <AppText variant="muted">{t('ingredientSuggestionsUnavailable')}</AppText>
      ) : null}
      {ingredientCatalogStatus === 'ready' && nameDraft.trim().length >= 2 && suggestions.length === 0 && !selectedIngredient ? (
        <AppText variant="muted">{t('ingredientSuggestionsEmpty')}</AppText>
      ) : null}
      {suggestions.length > 0 ? (
        <View accessibilityLabel={t('ingredientSuggestionsLabel')} style={styles.suggestionGroup}>
          <AppText style={styles.suggestionHeading} variant="muted">{t('ingredientSuggestionsTitle')}</AppText>
          <View style={styles.suggestions}>
            {suggestions.map((ingredient) => (
              <Pressable
                accessibilityLabel={ingredient.name}
                accessibilityRole="button"
                key={`${ingredient.provider}-${ingredient.id}`}
                onPress={() => handleIngredientSelect(ingredient)}
                style={({ pressed }) => [
                  styles.suggestion,
                  { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <AppText style={styles.suggestionText}>
                  {renderHighlightedIngredientName(ingredient.name, nameDraft, colors.accent)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {selectedIngredient ? (
        <AppText style={styles.helper} variant="muted">{`${t('ingredientLinkedLabel')}: ${selectedIngredient.name}`}</AppText>
      ) : null}

      <AppText nativeID="expiration-date-label">{t('expirationDateLabel')}</AppText>
      <View style={styles.dateInputRow}>
        <TextInput
          accessibilityLabel={t('expirationDateLabel')}
          accessibilityLabelledBy="expiration-date-label"
          aria-invalid={expirationError !== null}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          onChangeText={handleExpirationChange}
          onSubmitEditing={handleSubmit}
          placeholder={t('expirationDatePlaceholder')}
          placeholderTextColor={colors.mutedText}
          ref={expirationInputRef}
          returnKeyType="done"
          style={[
            styles.input,
            styles.dateInput,
            {
              backgroundColor: colors.surface,
              borderColor: expirationError ? colors.errorText : colors.border,
              color: colors.text,
            },
          ]}
          value={expirationDateDraft}
        />
        <ExpirationDatePicker onChange={handleExpirationChange} value={expirationDateDraft} />
      </View>
      {expirationError === 'required' ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('expirationDateRequired')}
        </AppText>
      ) : null}
      {expirationError === 'invalid' ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('expirationDateInvalid')}
        </AppText>
      ) : null}
      {expirationError === 'past' ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('expirationDatePast')}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button onPress={onCancel} style={styles.action}>
          <ButtonText>{t('cancel')}</ButtonText>
        </Button>
        <Button onPress={handleSubmit} style={styles.action}>
          <ButtonText>{t('save')}</ButtonText>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  suggestionGroup: { gap: 2 },
  suggestionHeading: { fontSize: 13, lineHeight: 18 },
  suggestions: { gap: 2 },
  suggestion: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  suggestionText: { fontSize: 15, lineHeight: 20 },
  highlight: { fontWeight: '700' },
  helper: { fontSize: 13, lineHeight: 18 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateInput: { flex: 1 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
