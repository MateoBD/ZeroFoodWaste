import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type ExpiredItemsBannerProps = {
  count: number;
  onPress: () => void;
};

/**
 * Announces how many pantry items have expired and opens their review.
 *
 * @param props - The expired item count and the review callback.
 * @returns A tappable banner, or null when nothing has expired.
 */
export function ExpiredItemsBanner({ count, onPress }: ExpiredItemsBannerProps) {
  const t = useMessages();
  const { colors } = useTheme();
  if (count < 1) return null;

  const message = count === 1 ? t('expiredItemsOne') : `${count} ${t('expiredItemsMany')}`;

  return (
    <Pressable
      accessibilityHint={t('expiredItemsReviewHint')}
      accessibilityLabel={message}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.banner, { backgroundColor: colors.urgentBackground }]}
      testID="expired-items-banner"
    >
      <AppText style={[styles.message, { color: colors.urgentText }]}>{message}</AppText>
      <AppText style={{ color: colors.urgentText }}>{`${t('expiredItemsReviewHint')} ›`}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  message: { fontWeight: '700' },
});
