import { useColorScheme } from 'react-native';

import { useAppSettings } from '@/settings/AppSettingsContext';

import { colors } from './tokens';

/**
 * Selects the semantic palette from the saved choice or system color scheme.
 *
 * An explicit light or dark choice overrides the device scheme; System follows it.
 * @returns The active semantic palette and whether the app is dark.
 */
export function useTheme() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAppSettings();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  return { colors: isDark ? colors.dark : colors.light, isDark };
}
