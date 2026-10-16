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
export type PantryModalState =
  | { mode: 'details' | 'edit' | 'confirm-zero'; itemId: string }
  | null;

type PantryItemModalProps = {
  state: PantryModalState;
  item?: PantryItem;
  ingredientCatalog: readonly IngredientCatalogEntry[];
  ingredientCatalogStatus: IngredientCatalogStatus;
  onClose: () => void;
  onEdit: () => void;
  onConsume: () => void;
  onDelete: () => void;
  onCancelZero: () => void;
  onQuantityChange: (delta: 1 | -1) => void;
  onWaste: () => void;
  onFindRecipes: (ingredient: IngredientReference) => void;
  onSave: (name: string, expirationDate: string, recipeIngredient: IngredientReference | null, quantity: number) => void;
};

/**
 * Shows item details, or the shared add and edit form, in one native modal.
 *
 * @param props - Modal state, item data, catalogue state, and action callbacks.
 * @returns The active pantry modal, or null when none is open.
 */
export function PantryItemModal({
  state, item, ingredientCatalog, ingredientCatalogStatus,
  onClose, onEdit, onConsume, onDelete, onCancelZero, onQuantityChange, onWaste, onFindRecipes, onSave,
}: PantryItemModalProps) {
  const t = useMessages();
  const { colors } = useTheme();
  if (!state || !item) return null;

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
          {state.mode === 'confirm-zero' ? (
            <View style={styles.details}>
              <AppText accessibilityRole="header" variant="title">{t('quantityZeroQuestion')}</AppText>
              <AppText>{item.name}</AppText>
              <Button onPress={onCancelZero}><ButtonText>{t('cancel')}</ButtonText></Button>
              <Button onPress={onConsume}><ButtonText>{t('markConsumed')}</ButtonText></Button>
              <Pressable accessibilityRole="button" onPress={onDelete}
                style={[styles.secondaryButton, { borderColor: colors.border }]}>
                <AppText style={{ color: colors.errorText }}>{t('removeFood')}</AppText>
              </Pressable>
            </View>
          ) : isDetails ? (
            <View style={styles.details}>
              <View style={styles.heading}>
                <AppText accessibilityRole="header" style={styles.detailTitle} variant="title">{item.name}</AppText>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                  <AppText style={{ color: colors.accent }}>{t('close')}</AppText>
                </Pressable>
              </View>
              <AppText>{`${t('expiresLabel')}: ${item.expirationDate}`}</AppText>
              <View style={styles.quantityControls}>
                <Pressable accessibilityLabel={t('decreaseQuantity')} accessibilityRole="button"
                  onPress={() => onQuantityChange(-1)} style={[styles.quantityButton, { borderColor: colors.border }]}>
                  <AppText>−</AppText>
                </Pressable>
                <AppText>{`${t('quantityLabel')}: ${item.quantity}`}</AppText>
                <Pressable accessibilityLabel={t('increaseQuantity')} accessibilityRole="button"
                  onPress={() => onQuantityChange(1)} style={[styles.quantityButton, { borderColor: colors.border }]}>
                  <AppText>+</AppText>
                </Pressable>
              </View>
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
                <Pressable
                  accessibilityRole="button"
                  onPress={onWaste}
                  style={[styles.secondaryButton, styles.action, { borderColor: colors.border }]}
                >
                  <AppText style={{ color: colors.errorText }}>{t('markWasted')}</AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <AppText accessibilityRole="header" variant="title">
                {t('editFood')}
              </AppText>
              <PantryItemForm
                key={state.itemId}
                initialExpirationDate={item?.expirationDate}
                initialName={item.name}
                initialQuantity={item.quantity}
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
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  quantityButton: { width: 48, height: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  action: { width: '100%' },
  secondaryButton: {
    minHeight: 48, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
});
