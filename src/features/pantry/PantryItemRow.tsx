import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type PantryItemRowProps = {
  expirationDate: string;
  name: string;
  onEdit: (id: string) => void;
  id: string;
};

/**
 * Renders an accessible pantry item row with an edit action.
 *
 * @param props - The item identity, food name, expiration date, and edit callback.
 * @returns A memoized pantry row.
 */
export const PantryItemRow = memo(function PantryItemRow({
  expirationDate,
  name,
  id,
  onEdit,
}: PantryItemRowProps) {
  const t = useMessages();
  const { colors } = useTheme();
  const label = `${name}, ${t('expiresLabel')}: ${expirationDate}`;

  return (
    <Surface style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.content}>
        <AppText style={styles.name}>{name}</AppText>
        <AppText variant="muted">{`${t('expiresLabel')}: ${expirationDate}`}</AppText>
      </View>
      <Pressable
        accessibilityLabel={t('editItem')}
        accessibilityRole="button"
        onPress={() => onEdit(id)}
        style={[styles.editButton, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          size={18}
          tintColor={colors.mutedText}
        />
      </Pressable>
    </Surface>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 76, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editButton: {
    minWidth: 40,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: spacing.xs },
  name: { fontWeight: '600' },
});
