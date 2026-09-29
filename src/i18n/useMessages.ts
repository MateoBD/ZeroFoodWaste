import { useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { createTranslator } from './translate';

/**
 * Selects messages for the device or per-app locale with English fallback.
 *
 * @returns A memoized function that translates one known message key.
 */
export function useMessages() {
  const locales = useLocales();
  const languageCode = locales[0]?.languageCode;
  return useMemo(() => createTranslator(languageCode), [languageCode]);
}
