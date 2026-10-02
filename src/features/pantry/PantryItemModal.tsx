import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import type { IngredientCatalogEntry, IngredientReference } from '@/features/recipes/ingredient';
import type { IngredientCatalogStatus } from '@/features/recipes/useIngredientCatalog';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { ExpirationBadge } from './ExpirationBadge';
import { PantryItemForm } from './PantryItemForm';
import { getExpirationUrgency } from './expirationUrgency';
import type { PantryItem } from './pantryItem';

/** Identifies the content shown in the single pantry item modal. */
export type PantryModalState = { mode: 'add' } | { mode: 'details' | 'edit'; itemId: string } | null;

type PantryItemModalProps = {
  state: PantryModalState;
  item?: PantryItem;
  ingredientCatalog: readonly IngredientCatalogEntry[];
  ingredientCatalogStatus: IngredientCatalogStatus;
  onClose: () => void;
  onEdit: () => void;
  onConsume: () => void;
  onFindRecipes: (ingredient: IngredientReference) => void;
  onSave: (name: string, expirationDate: string, recipeIngredient: IngredientReference | null) => void;
};

/**
 * Shows item details, or the shared add and edit form, in one native modal.
 *
 * @param props - Modal state, item data, catalogue state, and action callbacks.
 * @returns The active pantry modal, or null when none is open.
 */
export function PantryItemModal({
  state, item, ingredientCatalog, ingredientCatalogStatus,
  onClose, onEdit, onConsume, onFindRecipes, onSave,
}: PantryItemModalProps) {
  const t = useMessages();
  const { colors } = useTheme();
  if (!state || (state.mode !== 'add' && !item)) return null;

  const isDetails = state.mode === 'details';
  const urgency = item ? getExpirationUrgency(item.expirationDate) : null;

  return (
    <Modal
      allowSwipeDismissal
      animationType="slide"
      backdropColor={colors.background}
      onRequestClose={onClose}
      presentationStyle="formSheet"
      testID={isDetails ? 'pantry-item-details-modal' : 'pantry-item-form-modal'}
      visible
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {isDetails && item ? (
            <View style={styles.details}>
              <View style={styles.heading}>
                <AppText accessibilityRole="header" style={styles.detailTitle} variant="title">{item.name}</AppText>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                  <AppText style={{ color: colors.accent }}>{t('close')}</AppText>
                </Pressable>
              </View>
              <AppText>{`${t('expiresLabel')}: ${item.expirationDate}`}</AppText>
              {urgency ? <ExpirationBadge expirationDate={item.expirationDate} /> : null}
              {item.recipeIngredient ? (
                <View style={styles.recipeSection}>
                  <AppText variant="muted">{`${t('ingredientLinkedLabel')}: ${item.recipeIngredient.name}`}</AppText>
                  <Pressable
                    accessibilityLabel={`${t('findRecipes')}: ${item.recipeIngredient.name}`}
                    accessibilityRole="button"
                    onPress={() => onFindRecipes(item.recipeIngredient!)}
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                  >
                    <AppText style={{ color: colors.accent }}>{t('findRecipes')}</AppText>
                  </Pressable>
                </View>
              ) : (
                <AppText variant="muted">{t('ingredientUnlinkedDetails')}</AppText>
              )}
              <View style={styles.actions}>
                <Button onPress={onEdit} style={styles.action}>
                  <ButtonText>{t('editFood')}</ButtonText>
                </Button>
                <Pressable
                  accessibilityRole="button"
                  onPress={onConsume}
                  style={[styles.secondaryButton, styles.action, { borderColor: colors.border }]}
                >
                  <AppText style={{ color: colors.text }}>{t('markConsumed')}</AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <AppText accessibilityRole="header" variant="title">
                {t(state.mode === 'edit' ? 'editFood' : 'addFood')}
              </AppText>
              <PantryItemForm
                key={state.mode === 'edit' ? state.itemId : 'add'}
                initialExpirationDate={item?.expirationDate}
                initialName={item?.name}
                initialRecipeIngredient={item?.recipeIngredient}
                ingredientCatalog={ingredientCatalog}
                ingredientCatalogStatus={ingredientCatalogStatus}
                isEditing={state.mode === 'edit'}
                onCancel={onClose}
                onSave={onSave}
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  details: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  detailTitle: { flex: 1 },
  closeButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  recipeSection: { gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  action: { width: '100%' },
  secondaryButton: {
    minHeight: 48, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
});
