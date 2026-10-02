import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';

type PantryHeaderProps = {
  hasSaveError: boolean;
};

/**
 * Displays the pantry heading and any device-storage save warning.
 *
 * @param props - Whether the latest device-local save failed.
 * @returns The localized pantry header.
 */
export function PantryHeader({ hasSaveError }: PantryHeaderProps) {
  const t = useMessages();

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
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  introduction: { gap: spacing.xs },
});
