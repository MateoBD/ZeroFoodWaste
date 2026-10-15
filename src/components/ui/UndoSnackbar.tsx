import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** Duration of each visible Undo opportunity, in milliseconds. */
export const UNDO_SNACKBAR_DURATION_MS = 4000;
const SNACKBAR_EXIT_DISTANCE = 180;

type UndoSnackbarProps = {
  message: string;
  isError?: boolean;
  actionLabel?: string;
  bottom: number;
  onDismiss: (reason: 'expired' | 'action') => void;
};

/**
 * Announces one change at the bottom of the screen with a timed Undo action.
 *
 * The parent mounts a new instance for each queued change. The message moves
 * below the screen after its four-second window or after its action is pressed.
 * A shrinking bar shows how much of the current window remains.
 *
 * @param props - Message, placement, optional action label, save state, and dismissal callback.
 * @returns A compact animated confirmation with one accessible action button.
 */
export function UndoSnackbar({ message, isError = false, actionLabel, bottom, onDismiss }: UndoSnackbarProps) {
  const t = useMessages();
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SNACKBAR_EXIT_DISTANCE));
  const [remainingTime] = useState(() => new Animated.Value(1));
  const dismissing = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissCallback = useRef(onDismiss);
  useEffect(() => { dismissCallback.current = onDismiss; }, [onDismiss]);

  const dismiss = useCallback((reason: 'expired' | 'action') => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: SNACKBAR_EXIT_DISTANCE, duration: 180, useNativeDriver: true }),
    ]).start();
    dismissTimer.current = setTimeout(() => dismissCallback.current(reason), 180);
  }, [opacity, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    Animated.timing(remainingTime, {
      toValue: 0,
      duration: UNDO_SNACKBAR_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    const timeout = setTimeout(() => dismiss('expired'), UNDO_SNACKBAR_DURATION_MS);
    return () => {
      clearTimeout(timeout);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      opacity.stopAnimation();
      translateY.stopAnimation();
      remainingTime.stopAnimation();
    };
  // Each snackbar is keyed by action ID, so its timer starts only on mount.
  }, [dismiss, opacity, remainingTime, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          bottom,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      testID="undo-snackbar"
    >
      <View style={styles.content}>
        <AppText
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: isError ? colors.errorText : colors.text }]}
        >
          {message}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => dismiss('action')}
          style={styles.undoButton}
        >
          <AppText style={[styles.undoText, { color: colors.accent }]}>{actionLabel ?? t('undo')}</AppText>
        </Pressable>
      </View>
      <View accessible={false} style={[styles.timerTrack, { backgroundColor: colors.border }]} testID="undo-snackbar-timer-track">
        <Animated.View
          style={[
            styles.timerFill,
            {
              backgroundColor: isError ? colors.errorText : colors.accent,
              transformOrigin: 'left center',
              transform: [{ scaleX: remainingTime }],
            },
          ]}
          testID="undo-snackbar-timer"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: spacing.md, right: spacing.md,
    minHeight: 56,
    borderWidth: 1, borderRadius: 14, borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    overflow: 'hidden',
  },
  content: {
    minHeight: 52, paddingLeft: spacing.md, paddingRight: spacing.xs,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  timerTrack: { height: 4, width: '100%', overflow: 'hidden' },
  timerFill: { height: 4, width: '100%' },
  message: { flex: 1, fontWeight: '600' },
  undoButton: { minHeight: 48, minWidth: 56, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  undoText: { fontWeight: '700' },
});
