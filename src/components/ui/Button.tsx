import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export function ButtonText({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <Text style={[styles.buttonText, { color: colors.accentText }]}>{children}</Text>;
}

type ButtonProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function Button({ children, style, ...props }: PropsWithChildren<ButtonProps>) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: colors.accent }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
