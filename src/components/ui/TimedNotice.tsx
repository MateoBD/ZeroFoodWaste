import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

const DURATION_MS = 4000;

type TimedNoticeProps = Readonly<{
  message: string;
  actionLabel: string;
  bottom: number;
  onAction: () => void;
  onDismiss: () => void;
}>;

/**
 * Shows a compact safe-area-aware message with one action for four seconds.
 * @param props - Message, placement, action, and dismissal callbacks.
 * @returns An animated bottom notice with a shrinking timer bar.
 */
export function TimedNotice({ message, actionLabel, bottom, onAction, onDismiss }: TimedNoticeProps) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(180));
  const [remaining] = useState(() => new Animated.Value(1));
  const finished = useRef(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  const dismiss = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 180, duration: 180, useNativeDriver: true }),
    ]).start(() => dismissRef.current());
  }, [opacity, translateY]);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    Animated.timing(remaining, {
      toValue: 0, duration: DURATION_MS, easing: Easing.linear, useNativeDriver: true,
    }).start();
    const timer = setTimeout(dismiss, DURATION_MS);
    return () => {
      clearTimeout(timer); opacity.stopAnimation(); translateY.stopAnimation(); remaining.stopAnimation();
    };
  }, [dismiss, opacity, remaining, translateY]);
  const handleAction = useCallback(() => { onAction(); dismiss(); }, [dismiss, onAction]);
  return (
    <Animated.View
      style={[styles.container, {
        backgroundColor: colors.surface, borderColor: colors.border, bottom, opacity,
        transform: [{ translateY }],
      }]}
      testID="recipe-update-notice"
    >
      <View style={styles.content}>
        <AppText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.text }]}>{message}</AppText>
        <Pressable accessibilityRole="button" onPress={handleAction} style={styles.action}>
          <AppText style={[styles.actionText, { color: colors.accent }]}>{actionLabel}</AppText>
        </Pressable>
      </View>
      <View accessible={false} style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, {
          backgroundColor: colors.accent, transformOrigin: 'left center', transform: [{ scaleX: remaining }],
        }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: spacing.md, right: spacing.md, minHeight: 48,
    borderWidth: 1, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.16)',
  },
  content: {
    minHeight: 45, paddingLeft: spacing.md, paddingRight: spacing.xs,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  message: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  action: { minHeight: 44, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
  track: { height: 3, width: '100%', overflow: 'hidden' },
  fill: { height: 3, width: '100%' },
});
