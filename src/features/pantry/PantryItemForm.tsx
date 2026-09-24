import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type PantryItemFormProps = {
  onSave: (name: string) => void;
};

export function PantryItemForm({ onSave }: PantryItemFormProps) {
  const [draft, setDraft] = useState('');
  const [hasError, setHasError] = useState(false);
  const t = useMessages();
  const { colors } = useTheme();

  function handleChangeText(value: string) {
    setDraft(value);
    if (hasError) {
      setHasError(false);
    }
  }

  function handleSubmit() {
    const name = draft.trim();

    if (!name) {
      setHasError(true);
      return;
    }

    setDraft('');
    setHasError(false);
    onSave(name);
  }

  return (
    <View style={styles.form}>
      <AppText nativeID="food-name-label">{t('foodNameLabel')}</AppText>
      <TextInput
        accessibilityLabel={t('foodNameLabel')}
        accessibilityLabelledBy="food-name-label"
        aria-invalid={hasError}
        autoCapitalize="sentences"
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        placeholder={t('foodNamePlaceholder')}
        placeholderTextColor={colors.mutedText}
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.errorText : colors.border,
            color: colors.text,
          },
        ]}
        value={draft}
      />
      {hasError ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('foodNameRequired')}
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
