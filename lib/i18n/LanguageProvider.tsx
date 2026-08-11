import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { i18next } from './index';
import { DEFAULT_LANGUAGE, detectDeviceLanguage, isSupportedLanguage, type SupportedLanguage } from './languages';

const LANGUAGE_KEY = 'jibex.language';

/** Mirrors `lib/token.ts` — SecureStore has no web implementation, so web falls back to localStorage. */
const isWeb = Platform.OS === 'web';

async function readPersistedLanguage(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(LANGUAGE_KEY);
  return SecureStore.getItemAsync(LANGUAGE_KEY);
}

async function writePersistedLanguage(language: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(LANGUAGE_KEY, language);
    return;
  }
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/**
 * Resolves the driver's language on mount — a persisted explicit choice
 * wins, otherwise the device language (already applied synchronously in
 * `index.ts` as the first-frame guess) stands. Switching language calls
 * `i18next.changeLanguage`, which re-renders every component subscribed via
 * `useTranslation`/`useLanguage` immediately — no app restart needed.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    isSupportedLanguage(i18next.language) ? i18next.language : DEFAULT_LANGUAGE
  );

  useEffect(() => {
    readPersistedLanguage().then((stored) => {
      const resolved = isSupportedLanguage(stored) ? stored : detectDeviceLanguage();
      if (resolved !== i18next.language) {
        i18next.changeLanguage(resolved);
      }
      setLanguageState(resolved);
    });
  }, []);

  function setLanguage(next: SupportedLanguage) {
    setLanguageState(next);
    i18next.changeLanguage(next);
    writePersistedLanguage(next);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
  );
}
