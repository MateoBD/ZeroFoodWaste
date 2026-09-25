import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

type PantryItemRowProps = {
  expirationDate: string;
  name: string;
};

export const PantryItemRow = memo(function PantryItemRow({
  expirationDate,
  name,
}: PantryItemRowProps) {
  const t = useMessages();
  const label = `${name}, ${t('expiresLabel')}: ${expirationDate}`;

  return (
    <Surface style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.content}>
        <AppText style={styles.name}>{name}</AppText>
        <AppText variant="muted">{`${t('expiresLabel')}: ${expirationDate}`}</AppText>
      </View>
    </Surface>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 76, justifyContent: 'center' },
  content: { gap: spacing.xs },
  name: { fontWeight: '600' },
});
