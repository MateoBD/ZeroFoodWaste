import { useColorScheme } from 'react-native';

import { colors } from './tokens';

/**
 * Selects the semantic palette for the current system color scheme.
 *
 * @returns The active light or dark color palette.
 */
export function useTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === 'dark' ? colors.dark : colors.light };
}
