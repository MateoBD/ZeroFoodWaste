import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { spacing } from '@/theme/tokens';

type PantryItemRowProps = {
  name: string;
};

export const PantryItemRow = memo(function PantryItemRow({ name }: PantryItemRowProps) {
  return (
    <Surface style={styles.row} accessible accessibilityLabel={name}>
      <View style={styles.content}>
        <AppText style={styles.name}>{name}</AppText>
      </View>
    </Surface>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 76, justifyContent: 'center' },
  content: { gap: spacing.xs },
  name: { fontWeight: '600' },
});
