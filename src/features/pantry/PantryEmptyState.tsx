import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

/**
 * Displays the message shown after an empty pantry loads successfully.
 *
 * @returns The localized empty-pantry state.
 */
export function PantryEmptyState() {
  const t = useMessages();

  return (
    <View style={styles.container}>
      <AppText variant="muted">{t('pantryEmpty')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.lg },
});
