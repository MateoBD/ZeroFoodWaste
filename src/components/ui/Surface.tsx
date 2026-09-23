import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export function Surface({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[styles.surface, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
});
