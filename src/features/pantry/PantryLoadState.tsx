import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type PantryLoadStateProps = {
  status: 'loading' | 'error';
  onRetry: () => void;
};

/**
 * Shows the initial loading state or a retryable load error.
 *
 * @param props - The active load state and retry callback.
 * @returns A localized loading indicator or error action.
 */
export function PantryLoadState({ status, onRetry }: PantryLoadStateProps) {
  const t = useMessages();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} />
        <AppText accessibilityLiveRegion="polite" variant="muted">
          {t('pantryLoading')}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
        {t('pantryLoadError')}
      </AppText>
      <Button onPress={onRetry}>
        <ButtonText>{t('retry')}</ButtonText>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.lg, gap: spacing.md },
});
