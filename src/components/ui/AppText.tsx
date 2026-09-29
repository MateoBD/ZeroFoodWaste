import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';

type Props = PropsWithChildren<TextProps & { variant?: 'body' | 'error' | 'title' | 'muted' }>;

/**
 * Renders text with semantic theme colors and an optional visual variant.
 *
 * @param props - Native text props, children, and the requested visual variant.
 * @returns The themed text element.
 */
export function AppText({ children, style, variant = 'body', ...props }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        styles.base,
        variant === 'title' ? styles.title : null,
        {
          color:
            variant === 'muted'
              ? colors.mutedText
              : variant === 'error'
                ? colors.errorText
                : colors.text,
        },
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
