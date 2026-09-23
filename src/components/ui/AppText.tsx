import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';

type Props = PropsWithChildren<TextProps & { variant?: 'body' | 'title' | 'muted' }>;

export function AppText({ children, style, variant = 'body', ...props }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        styles.base,
        variant === 'title' ? styles.title : null,
        { color: variant === 'muted' ? colors.mutedText : colors.text },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '700' },
});
