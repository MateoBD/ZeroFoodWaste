import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

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
