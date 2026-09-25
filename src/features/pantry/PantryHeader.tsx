import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

import { PantryItemForm } from './PantryItemForm';

type PantryHeaderProps = {
  canAddItems: boolean;
  hasSaveError: boolean;
  isFormVisible: boolean;
  onSave: (name: string, expirationDate: string) => void;
  onToggleForm: () => void;
};

export function PantryHeader({
  canAddItems,
  hasSaveError,
  isFormVisible,
  onSave,
  onToggleForm,
}: PantryHeaderProps) {
  const t = useMessages();
  const toggleLabel = isFormVisible ? t('cancel') : t('addFood');

  return (
    <View style={styles.header}>
      <View style={styles.introduction}>
        <AppText accessibilityRole="header" variant="title">
          {t('pantryTitle')}
        </AppText>
        <AppText variant="muted">{t('storageNotice')}</AppText>
      </View>
      {hasSaveError ? (
        <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="error">
          {t('pantrySaveError')}
        </AppText>
      ) : null}
      {canAddItems ? (
        <Button
          accessibilityLabel={toggleLabel}
          accessibilityState={{ expanded: isFormVisible }}
          onPress={onToggleForm}
        >
          <ButtonText>{toggleLabel}</ButtonText>
        </Button>
      ) : null}
      {canAddItems && isFormVisible ? <PantryItemForm onSave={onSave} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  introduction: { gap: spacing.xs },
});
