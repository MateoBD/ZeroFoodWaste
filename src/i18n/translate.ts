import { I18n } from 'i18n-js';

import { en, es, type MessageKey } from './messages';

/**
 * Creates a typed translator with English fallback for the requested locale.
 *
 * @param languageCode - The preferred language code, or null when unavailable.
 * @returns A function that translates one known message key.
 */
export function createTranslator(languageCode: string | null | undefined) {
  const i18n = new I18n({ en, es });
  i18n.defaultLocale = 'en';
  i18n.enableFallback = true;
  i18n.locale = languageCode ?? 'en';
  return (key: MessageKey): string => i18n.t(key);
}
