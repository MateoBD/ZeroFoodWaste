import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { ExpirationBadge } from './ExpirationBadge';
import type { PantryItem } from './pantryItem';

type ExpiredItemsModalProps = {
  visible: boolean;
  items: readonly PantryItem[];
  onClose: () => void;
  onConsume: (id: string) => void;
  onWaste: (id: string) => void;
};

/**
 * Lists expired pantry items and asks whether each was eaten or thrown away.
 *
 * @param props - Visibility, the expired items, and the outcome callbacks.
 * @returns The expired-food review modal, or null when hidden.
 */
export function ExpiredItemsModal({ visible, items, onClose, onConsume, onWaste }: ExpiredItemsModalProps) {
  const t = useMessages();
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal
      allowSwipeDismissal
      animationType="slide"
      backdropColor={colors.background}
      onRequestClose={onClose}
      presentationStyle="formSheet"
      testID="expired-items-modal"
      visible
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
          <View style={styles.heading}>
            <AppText accessibilityRole="header" style={styles.title} variant="title">{t('expiredReviewTitle')}</AppText>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <AppText style={{ color: colors.accent }}>{t('close')}</AppText>
            </Pressable>
          </View>
          <AppText variant="muted">{t('expiredReviewDescription')}</AppText>
          {items.map((item) => (
            <Surface key={item.id} style={styles.item} testID={`expired-item-${item.id}`}>
              <AppText style={styles.name}>{item.name}</AppText>
              <ExpirationBadge expirationDate={item.expirationDate} />
              <AppText variant="muted">{`${t('expiresLabel')}: ${item.expirationDate}`}</AppText>
              <AppText variant="muted">{`${t('quantityLabel')}: ${item.quantity}`}</AppText>
              <View style={styles.actions}>
                <Pressable
                  accessibilityLabel={`${t('ateIt')}: ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => onConsume(item.id)}
                  style={[styles.actionButton, { borderColor: colors.border }]}
                >
                  <AppText style={{ color: colors.text }}>{t('ateIt')}</AppText>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${t('threwItAway')}: ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => onWaste(item.id)}
                  style={[styles.actionButton, { borderColor: colors.border }]}
                >
                  <AppText style={{ color: colors.errorText }}>{t('threwItAway')}</AppText>
                </Pressable>
              </View>
            </Surface>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1 },
  closeButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  item: { gap: spacing.xs },
  name: { fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: {
    flexGrow: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
});
