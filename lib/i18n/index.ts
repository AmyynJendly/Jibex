import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import fr from './fr';
import { DEFAULT_LANGUAGE, detectDeviceLanguage } from './languages';

export * from './languages';

// Synchronous init with the device-language best guess so the very first
// frame already renders in a sensible language — `LanguageProvider` then
// swaps in a persisted override, if any, once SecureStore resolves.
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
