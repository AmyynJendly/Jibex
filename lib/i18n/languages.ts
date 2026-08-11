import * as Localization from 'expo-localization';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(value: string | undefined | null): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Device language on first launch, falling back to English if it's neither EN nor FR. */
export function detectDeviceLanguage(): SupportedLanguage {
  const deviceCode = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(deviceCode) ? deviceCode : DEFAULT_LANGUAGE;
}
