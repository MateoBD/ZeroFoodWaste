import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { PantryItemForm } from './PantryItemForm';

type PantryItemFormModalProps = {
  mode: 'add' | 'edit';
  initialName?: string;
  initialExpirationDate?: string;
  isVisible: boolean;
  onCancel: () => void;
  onSave: (name: string, expirationDate: string) => void;
};

export function PantryItemFormModal({
  isVisible,
  mode,
  initialName,
  initialExpirationDate,
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
