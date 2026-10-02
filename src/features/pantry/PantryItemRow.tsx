import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

import { ExpirationBadge, urgencyMessageKeys } from './ExpirationBadge';
import { getExpirationUrgency } from './expirationUrgency';

type PantryItemRowProps = {
  expirationDate: string;
  name: string;
  id: string;
  onOpen: (id: string) => void;
};

/**
 * Opens a pantry item's details from a single accessible list button.
 *
 * @param props - Item identity, visible values, and the details callback.
 * @returns A memoized pantry row.
 */
export const PantryItemRow = memo(function PantryItemRow({
  expirationDate, name, id, onOpen,
}: PantryItemRowProps) {
  const t = useMessages();
  const urgency = getExpirationUrgency(expirationDate);
  const urgencyLabel = urgency ? `, ${t(urgencyMessageKeys[urgency])}` : '';
  const label = `${name}, ${t('expiresLabel')}: ${expirationDate}${urgencyLabel}`;

  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={() => onOpen(id)}>
      <Surface style={styles.row}>
        <View style={styles.titleLine}>
          <AppText style={styles.name}>{name}</AppText>
          {urgency ? <ExpirationBadge urgency={urgency} /> : null}
        </View>
        <AppText variant="muted">{`${t('expiresLabel')}: ${expirationDate}`}</AppText>
      </Surface>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 76, justifyContent: 'center', gap: spacing.xs },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { fontWeight: '600' },
});
