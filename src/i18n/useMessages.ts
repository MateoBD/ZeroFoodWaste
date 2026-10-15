import { useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { useAppSettings } from '@/settings/AppSettingsContext';
import { createTranslator } from './translate';

/**
 * Selects messages for the saved app language or the device locale.
 *
 * A manual English or Spanish choice overrides the device locale; unsupported
 * system locales continue to use the translator's English fallback.
 * @returns A memoized function that translates one known message key.
 */
export function useMessages() {
  const locales = useLocales();
  const { languageMode } = useAppSettings();
  const languageCode = languageMode === 'system' ? locales[0]?.languageCode : languageMode;
  return useMemo(() => createTranslator(languageCode), [languageCode]);
}
