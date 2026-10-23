import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientCatalogEntry, IngredientReference } from '@/features/recipes/ingredient';
import { matchIngredients } from '@/features/recipes/ingredientMatcher';
import type { IngredientCatalogStatus } from '@/features/recipes/useIngredientCatalog';
import { matchScannedRecipeIngredient } from '@/features/barcode/recipeIngredientMatch';
import { isTodayOrFutureCalendarDate, isValidCalendarDate } from './calendarDate';
import { ExpirationDatePicker } from './ExpirationDatePicker';
import { isValidPantryQuantity } from './pantryItem';

type FormInputHandle = ComponentRef<typeof TextInput> | ComponentRef<typeof BottomSheetTextInput>;

type PantryItemFormProps = {
  initialName?: string;
  initialExpirationDate?: string;
  initialQuantity?: number;
  initialRecipeIngredient?: IngredientReference | null;
  initialRecipeIngredientCandidates?: readonly string[];
  ingredientCatalog: readonly IngredientCatalogEntry[];
  ingredientCatalogStatus: IngredientCatalogStatus;
  isEditing: boolean;
  useSheetInputs?: boolean;
  onBeginManualEntry?: () => void;
  onFormLayout?: (event: LayoutChangeEvent) => void;
  onRecipeSectionLayout?: (event: LayoutChangeEvent) => void;
  onRecipeFocus?: () => void;
  onRecipeBlur?: () => void;
  onCancel: () => void;
  onSave: (
    name: string,
    expirationDate: string,
    recipeIngredient: IngredientReference | null,
    quantity: number,
    consumedUnits: number,
  ) => void;
};

/**
 * Collects a food name, whole-unit quantity, and package date with optional ingredient autocomplete.
 *
 * The form validates a non-empty name, positive safe integer quantity, and a valid local YYYY-MM-DD date that
 * is today or later before calling the save callback. An unchanged expired
 * date remains valid while editing an existing item.
 *
 * @param props - Initial values, catalogue state, and save or cancel callbacks.
 * @returns The add or edit form.
 */
export function PantryItemForm({
  initialName = '',
  initialExpirationDate = '',
  initialQuantity = 1,
  initialRecipeIngredient = null,
  initialRecipeIngredientCandidates,
  ingredientCatalog,
  ingredientCatalogStatus,
  isEditing,
  useSheetInputs = false,
  onBeginManualEntry,
  onFormLayout,
  onRecipeSectionLayout,
  onRecipeFocus,
  onRecipeBlur,
  onCancel,
  onSave,
}: PantryItemFormProps) {
  const [nameDraft, setNameDraft] = useState(initialName);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientReference | null>(initialRecipeIngredient);
  const [recipeQuery, setRecipeQuery] = useState(initialRecipeIngredient?.name ?? '');
  const [recipeTouched, setRecipeTouched] = useState(false);
  const [isRecipeActive, setIsRecipeActive] = useState(false);
  const [isIngredientHelpVisible, setIsIngredientHelpVisible] = useState(false);
  const [expirationDateDraft, setExpirationDateDraft] = useState(initialExpirationDate);
  const [quantityDraft, setQuantityDraft] = useState(String(initialQuantity));
  const [stepperConsumedUnits, setStepperConsumedUnits] = useState(0);
  const [hasQuantityError, setHasQuantityError] = useState(false);
  const [hasNameError, setHasNameError] = useState(false);
  const [expirationError, setExpirationError] = useState<'required' | 'invalid' | 'past' | null>(
    null,
  );
  const expirationInputRef = useRef<{ focus: () => void } | null>(null);
  const quantityInputRef = useRef<{ focus: () => void } | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectingSuggestion = useRef(false);
  const t = useMessages();
  const { colors } = useTheme();
  const Input = useSheetInputs ? BottomSheetTextInput : TextInput;
  const scanSuggestion = useMemo(
    () => initialRecipeIngredientCandidates && !recipeTouched
      ? matchScannedRecipeIngredient(initialRecipeIngredientCandidates, ingredientCatalog)
      : null,
    [initialRecipeIngredientCandidates, ingredientCatalog, recipeTouched],
  );
  const effectiveIngredient = recipeTouched ? selectedIngredient : selectedIngredient ?? scanSuggestion;
  const displayedRecipeQuery = recipeTouched ? recipeQuery : effectiveIngredient?.name ?? recipeQuery;
  const numericQuantity = Number(quantityDraft.trim());
  const isWholeQuantity = /^\d+$/.test(quantityDraft.trim()) && Number.isSafeInteger(numericQuantity);
  const canDecreaseQuantity = isEditing && isWholeQuantity && numericQuantity > 0;
  const canIncreaseQuantity = isEditing && isWholeQuantity && numericQuantity < Number.MAX_SAFE_INTEGER;
  const recipeSuggestions = useMemo(
    () => isRecipeActive && recipeQuery.trim().length >= 2
      ? matchIngredients(recipeQuery, ingredientCatalog) : [],
    [ingredientCatalog, isRecipeActive, recipeQuery],
  );

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  function handleNameChange(value: string) {
    setNameDraft(value);
    if (hasNameError) {
      setHasNameError(false);
    }
  }

  function handleExpirationChange(value: string) {
    setExpirationDateDraft(value);
    if (expirationError) {
      setExpirationError(null);
    }
  }

  function stepQuantity(delta: 1 | -1) {
    if (delta < 0 && !canDecreaseQuantity) return;
    if (delta > 0 && !canIncreaseQuantity) return;
    setQuantityDraft(String(numericQuantity + delta));
    setStepperConsumedUnits((amount) => delta < 0 ? amount + 1 : Math.max(0, amount - 1));
    setHasQuantityError(false);
  }

  function handleSubmit() {
    const trimmedName = nameDraft.trim();
    const trimmedExpiration = expirationDateDraft.trim();
    const trimmedQuantity = quantityDraft.trim();
    const quantity = Number(trimmedQuantity);
    let isFormValid = true;

    const isAllowedZero = isEditing && quantity === 0;
    if (!/^\d+$/.test(trimmedQuantity) || (!isAllowedZero && !isValidPantryQuantity(quantity))) {
      setHasQuantityError(true);
      isFormValid = false;
    }

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
    } else if (!isTodayOrFutureCalendarDate(trimmedExpiration) &&
      !(isEditing && trimmedExpiration === initialExpirationDate)) {
      setExpirationError('past');
      isFormValid = false;
    }

    if (!isFormValid) {
      return;
    }

    setNameDraft('');
    setExpirationDateDraft('');
    setQuantityDraft('1');
    setHasNameError(false);
    setHasQuantityError(false);
    setExpirationError(null);
    onSave(trimmedName, trimmedExpiration, effectiveIngredient, quantity, stepperConsumedUnits);
  }

  return (
    <View onLayout={onFormLayout} style={styles.form} testID="pantry-item-form">
      <AppText nativeID="food-name-label">{t('foodNameLabel')}</AppText>
      <Input
        accessibilityLabel={t('foodNameLabel')}
        accessibilityLabelledBy="food-name-label"
        aria-invalid={hasNameError}
        autoCapitalize="sentences"
        onChangeText={handleNameChange}
        onFocus={onBeginManualEntry}
        onSubmitEditing={() => quantityInputRef.current?.focus()}
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
      <AppText nativeID="food-quantity-label">{t('quantityLabel')}</AppText>
      <View style={styles.quantityRow}>
        {isEditing ? (
          <Pressable
            accessibilityLabel={t('consumeOneUnit')}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDecreaseQuantity }}
            disabled={!canDecreaseQuantity}
            onPress={() => stepQuantity(-1)}
            style={[styles.quantityButton, { borderColor: colors.border }]}
          >
            <AppText style={{ color: canDecreaseQuantity ? colors.text : colors.mutedText }}>−</AppText>
          </Pressable>
        ) : null}
        <Input
          accessibilityLabel={t('quantityLabel')}
          accessibilityLabelledBy="food-quantity-label"
          aria-invalid={hasQuantityError}
          keyboardType="number-pad"
          onChangeText={(value) => {
            setQuantityDraft(value);
            setStepperConsumedUnits(0);
            setHasQuantityError(false);
          }}
          onFocus={onBeginManualEntry}
          onSubmitEditing={() => expirationInputRef.current?.focus()}
          ref={(input: FormInputHandle | null | undefined) => {
            quantityInputRef.current = input && 'focus' in input && typeof input.focus === 'function'
              ? input
              : null;
          }}
          returnKeyType="next"
          style={[styles.input, styles.quantityInput, {
            backgroundColor: colors.surface,
            borderColor: hasQuantityError ? colors.errorText : colors.border,
            color: colors.text,
          }]}
          value={quantityDraft}
        />
        {isEditing ? (
          <Pressable
            accessibilityLabel={t('addOneUnit')}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canIncreaseQuantity }}
            disabled={!canIncreaseQuantity}
            onPress={() => stepQuantity(1)}
            style={[styles.quantityButton, { borderColor: colors.border }]}
          >
            <AppText style={{ color: canIncreaseQuantity ? colors.text : colors.mutedText }}>+</AppText>
          </Pressable>
        ) : null}
      </View>
      {isEditing ? <AppText variant="muted">{t('quantityCorrectionHint')}</AppText> : null}
      {stepperConsumedUnits > 0 ? (
        <AppText accessibilityLiveRegion="polite">
          {stepperConsumedUnits === 1
            ? t('savingWillRecordOneConsumed')
            : t('savingWillRecordConsumed', { count: stepperConsumedUnits })}
        </AppText>
      ) : null}
      {hasQuantityError ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t(isEditing ? 'quantityEditInvalid' : 'quantityInvalid')}
        </AppText>
      ) : null}
      <View onLayout={onRecipeSectionLayout} style={styles.suggestionGroup} testID="recipe-ingredient-section">
          <View style={styles.ingredientLabelRow}>
            <AppText nativeID="recipe-ingredient-search-label">{t('recipeIngredientSearchLabel')}</AppText>
            <Pressable
              accessibilityLabel={t('recipeIngredientHelpLabel')}
              accessibilityRole="button"
              accessibilityState={{ expanded: isIngredientHelpVisible }}
              onPress={() => {
                onBeginManualEntry?.();
                setIsIngredientHelpVisible((visible) => !visible);
              }}
              style={styles.ingredientHelpButton}
            >
              <SymbolView
                name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                size={22}
                tintColor={colors.accent}
              />
            </Pressable>
          </View>
          {isIngredientHelpVisible ? (
            <AppText
              accessibilityLiveRegion="polite"
              nativeID="recipe-ingredient-help"
              style={styles.helper}
              variant="muted"
            >
              {t('recipeIngredientHelp')}
            </AppText>
          ) : null}
          <Input
            accessibilityLabel={t('recipeIngredientSearchLabel')}
            accessibilityLabelledBy="recipe-ingredient-search-label"
            onChangeText={(value) => {
              setRecipeQuery(value);
              setRecipeTouched(true);
              setSelectedIngredient(null);
              setIsRecipeActive(true);
            }}
            onFocus={() => {
              setRecipeQuery(displayedRecipeQuery);
              setIsRecipeActive(true);
              onBeginManualEntry?.();
              onRecipeFocus?.();
            }}
            onBlur={() => {
              onRecipeBlur?.();
              if (blurTimer.current) clearTimeout(blurTimer.current);
              blurTimer.current = setTimeout(() => {
                if (!selectingSuggestion.current) setIsRecipeActive(false);
              }, 120);
            }}
            placeholder={t('recipeIngredientSearchPlaceholder')}
            placeholderTextColor={colors.mutedText}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={displayedRecipeQuery}
          />
          {effectiveIngredient ? (
            <View style={styles.linkedIngredientRow}>
              <AppText style={styles.helper} variant="muted">
                {scanSuggestion && !recipeTouched
                  ? `${t('scanIngredientSuggestion')}: ${effectiveIngredient.name}`
                  : `${t('ingredientLinkedLabel')}: ${effectiveIngredient.name}`}
              </AppText>
              <Pressable
                accessibilityLabel={t('clearRecipeIngredient')}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedIngredient(null);
                  setRecipeQuery('');
                  setRecipeTouched(true);
                }}
                style={styles.clearIngredient}
              >
                <AppText>{t('clearRecipeIngredient')}</AppText>
              </Pressable>
            </View>
          ) : isEditing ? (
            <AppText style={styles.helper} variant="muted">{t('ingredientUnlinkedEdit')}</AppText>
          ) : null}
          {recipeSuggestions.map((ingredient) => (
            <Pressable
              accessibilityLabel={`${t('ingredientLinkedLabel')}: ${ingredient.name}`}
              accessibilityRole="button"
              key={`${ingredient.provider}-${ingredient.id}`}
              onPressIn={() => { selectingSuggestion.current = true; }}
              onPress={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                selectingSuggestion.current = false;
                setSelectedIngredient(ingredient);
                setRecipeQuery(ingredient.name);
                setRecipeTouched(true);
                setIsRecipeActive(false);
              }}
              onPressOut={() => { selectingSuggestion.current = false; }}
              style={[styles.suggestion, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <AppText>{ingredient.name}</AppText>
            </Pressable>
          ))}
          {isRecipeActive && recipeQuery.trim().length >= 2 && recipeSuggestions.length === 0 && ingredientCatalogStatus === 'loading' ? (
            <AppText variant="muted">{t('ingredientSuggestionsLoading')}</AppText>
          ) : null}
          {isRecipeActive && recipeQuery.trim().length >= 2 && recipeSuggestions.length === 0 && ingredientCatalogStatus === 'ready' && !effectiveIngredient ? (
            <AppText variant="muted">{t('ingredientSuggestionsEmpty')}</AppText>
          ) : null}
          {ingredientCatalogStatus === 'error' && ingredientCatalog.length === 0 ? (
            <AppText variant="muted">{t('ingredientSuggestionsUnavailable')}</AppText>
          ) : null}
      </View>

      <AppText nativeID="expiration-date-label">{t('expirationDateLabel')}</AppText>
      <View style={styles.dateInputRow}>
        <Input
          accessibilityLabel={t('expirationDateLabel')}
          accessibilityLabelledBy="expiration-date-label"
          aria-invalid={expirationError !== null}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          onChangeText={handleExpirationChange}
          onFocus={onBeginManualEntry}
          onSubmitEditing={handleSubmit}
          placeholder={t('expirationDatePlaceholder')}
          placeholderTextColor={colors.mutedText}
          ref={(input: FormInputHandle | null | undefined) => {
            expirationInputRef.current = input && 'focus' in input && typeof input.focus === 'function'
              ? input
              : null;
          }}
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
  ingredientLabelRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ingredientHelpButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestion: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  helper: { fontSize: 13, lineHeight: 18 },
  linkedIngredientRow: { gap: spacing.xs },
  clearIngredient: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quantityInput: { flex: 1, textAlign: 'center' },
  quantityButton: { width: 48, height: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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
