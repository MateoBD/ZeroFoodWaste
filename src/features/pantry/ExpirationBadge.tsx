import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { MessageKey } from '@/i18n/messages';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { daysUntilExpiration, getExpirationUrgency, type ExpirationUrgency } from './expirationUrgency';

/**
 * Maps each urgency level to its translated label.
 */
export const urgencyMessageKeys: Record<ExpirationUrgency, MessageKey> = {
  expired: 'urgencyExpired',
  urgent: 'urgencyUrgent',
  soon: 'urgencySoon',
  fresh: 'urgencyFresh',
};

/**
 * Renders a colored, text-labelled badge for an item's expiration urgency.
 *
 * @param props - The package expiry date used for urgency and exact day text.
 * @returns A badge whose text conveys the same meaning as its color.
 */
export function ExpirationBadge({ expirationDate }: { expirationDate: string }) {
  const t = useMessages();
  const { colors } = useTheme();
  const urgency = getExpirationUrgency(expirationDate);
  const days = daysUntilExpiration(expirationDate);
  if (!urgency || days === null) return null;

  const label = days === 0
    ? t('useToday')
    : days === 1
      ? t('oneDayLeft')
      : days > 1
        ? `${days} ${t('daysLeft')}`
        : days === -1
          ? t('expiredYesterday')
          : `${t('urgencyExpired')} ${Math.abs(days)} ${t('daysAgo')}`;
  const palette = urgency === 'fresh'
    ? { backgroundColor: colors.freshBackground, color: colors.freshText }
    : urgency === 'soon'
      ? { backgroundColor: colors.soonBackground, color: colors.soonText }
      : { backgroundColor: colors.urgentBackground, color: colors.urgentText };

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]} testID={`expiration-badge-${urgency}`}>
      <AppText style={[styles.text, { color: palette.color }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  text: { fontSize: 13, fontWeight: '700' },
});
