import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientCatalogEntry, IngredientReference } from '@/features/recipes/ingredient';
import type { IngredientCatalogStatus } from '@/features/recipes/useIngredientCatalog';

import { PantryItemForm } from './PantryItemForm';

type PantryItemFormModalProps = {
  mode: 'add' | 'edit';
  initialName?: string;
  initialExpirationDate?: string;
  initialRecipeIngredient?: IngredientReference | null;
  ingredientCatalog: readonly IngredientCatalogEntry[];
  ingredientCatalogStatus: IngredientCatalogStatus;
  isVisible: boolean;
  onCancel: () => void;
  onSave: (name: string, expirationDate: string, recipeIngredient: IngredientReference | null) => void;
};

/**
 * Presents the shared add or edit form in a modal with scrollable content.
 *
 * @param props - Modal state, initial item values, catalogue state, and callbacks.
 * @returns The form modal when visible, or null when hidden.
 */
export function PantryItemFormModal({
  isVisible,
  mode,
  initialName,
  initialExpirationDate,
  initialRecipeIngredient,
  ingredientCatalog,
  ingredientCatalogStatus,
  onCancel,
  onSave,
}: PantryItemFormModalProps) {
  const t = useMessages();
  const { colors } = useTheme();

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      allowSwipeDismissal
      animationType="slide"
      backdropColor={colors.background}
      onRequestClose={onCancel}
      presentationStyle="formSheet"
      testID="pantry-item-form-modal"
      visible
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <AppText accessibilityRole="header" variant="title">
            {t(mode === 'edit' ? 'editFood' : 'addFood')}
          </AppText>
          <PantryItemForm
            initialExpirationDate={initialExpirationDate}
            initialName={initialName}
            initialRecipeIngredient={initialRecipeIngredient}
            ingredientCatalog={ingredientCatalog}
            ingredientCatalogStatus={ingredientCatalogStatus}
            onCancel={onCancel}
            onSave={onSave}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
});
