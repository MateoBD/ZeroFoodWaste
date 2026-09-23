import { useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { createTranslator } from './translate';

export function useMessages() {
  const locales = useLocales();
  const languageCode = locales[0]?.languageCode;
  return useMemo(() => createTranslator(languageCode), [languageCode]);
}
