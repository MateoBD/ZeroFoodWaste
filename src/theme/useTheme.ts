import { useColorScheme } from 'react-native';

import { colors } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === 'dark' ? colors.dark : colors.light };
}
