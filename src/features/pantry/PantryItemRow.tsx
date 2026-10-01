import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientReference } from '@/features/recipes/ingredient';

import { ExpirationBadge, urgencyMessageKeys } from './ExpirationBadge';
import { getExpirationUrgency } from './expirationUrgency';

type PantryItemRowProps = {
  expirationDate: string;
  name: string;
  onEdit: (id: string) => void;
  onFindRecipes: (ingredient: IngredientReference) => void;
  recipeIngredient: IngredientReference | null;
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
  onFindRecipes,
  recipeIngredient,
}: PantryItemRowProps) {
  const t = useMessages();
  const { colors } = useTheme();
  const urgency = getExpirationUrgency(expirationDate);
  const urgencyLabel = urgency ? `, ${t(urgencyMessageKeys[urgency])}` : '';
  const label = `${name}, ${t('expiresLabel')}: ${expirationDate}${urgencyLabel}`;

  return (
    <Surface style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.content}>
        <View style={styles.titleLine}>
          <AppText style={styles.name}>{name}</AppText>
          {urgency ? <ExpirationBadge urgency={urgency} /> : null}
        </View>
        <AppText variant="muted">{`${t('expiresLabel')}: ${expirationDate}`}</AppText>
        {recipeIngredient ? (
          <Pressable
            accessibilityLabel={`${t('findRecipes')}: ${recipeIngredient.name}`}
            accessibilityRole="button"
            onPress={() => onFindRecipes(recipeIngredient)}
            style={[styles.recipeButton, { borderColor: colors.border }]}
          >
            <AppText style={[styles.recipeButtonText, { color: colors.accent }]}>{t('findRecipes')}</AppText>
          </Pressable>
        ) : null}
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
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { fontWeight: '600' },
  recipeButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  recipeButtonText: { fontWeight: '700' },
});
