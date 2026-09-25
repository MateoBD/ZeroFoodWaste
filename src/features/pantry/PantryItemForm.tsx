import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type PantryItemFormProps = {
  onSave: (name: string, expirationDate: string) => void;
};

function isValidDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function PantryItemForm({ onSave }: PantryItemFormProps) {
  const [nameDraft, setNameDraft] = useState('');
  const [expirationDateDraft, setExpirationDateDraft] = useState('');
  const [hasNameError, setHasNameError] = useState(false);
  const [expirationError, setExpirationError] = useState<'required' | 'invalid' | null>(null);
  const expirationInputRef = useRef<TextInput>(null);
  const t = useMessages();
  const { colors } = useTheme();

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
    } else if (!isValidDate(trimmedExpiration)) {
      setExpirationError('invalid');
      isFormValid = false;
    }

    if (!isFormValid) {
      return;
    }

    setNameDraft('');
    setExpirationDateDraft('');
    setHasNameError(false);
    setExpirationError(null);
    onSave(trimmedName, trimmedExpiration);
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

      <AppText nativeID="expiration-date-label">{t('expirationDateLabel')}</AppText>
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
          {
            backgroundColor: colors.surface,
            borderColor: expirationError ? colors.errorText : colors.border,
            color: colors.text,
          },
        ]}
        value={expirationDateDraft}
      />
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

      <Button onPress={handleSubmit}>
        <ButtonText>{t('save')}</ButtonText>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
});
