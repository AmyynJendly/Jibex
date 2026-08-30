import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

const HAPTICS_KEY = 'jibex.hapticsEnabled';

/** Mirrors `lib/i18n/LanguageProvider.tsx` — SecureStore has no web implementation. */
const isWeb = Platform.OS === 'web';

async function readPersisted(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(HAPTICS_KEY);
  return SecureStore.getItemAsync(HAPTICS_KEY);
}

async function writePersisted(value: boolean): Promise<void> {
  const raw = value ? '1' : '0';
  if (isWeb) {
    localStorage.setItem(HAPTICS_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(HAPTICS_KEY, raw);
}

interface HapticsContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const HapticsContext = createContext<HapticsContextValue | null>(null);

/**
 * Whether `AnimatedPressable` should fire tactile feedback.
 *
 * Read by every pressable in the app, so this stays a plain boolean rather
 * than something a driver has to reconfigure per screen — one switch in
 * Profile, respected everywhere. Defaults on for the reason `AnimatedPressable`
 * itself defaults its `haptic` prop on: the app had no touch feedback at all
 * before, and that read as inert. Off is for the driver who finds it too much
 * once they've felt it.
 */
export function useHapticsEnabled() {
  const ctx = useContext(HapticsContext);
  if (!ctx) throw new Error('useHapticsEnabled must be used within HapticsProvider');
  return ctx;
}

export function HapticsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    readPersisted().then((stored) => {
      if (stored !== null) setEnabledState(stored === '1');
    });
  }, []);

  function setEnabled(next: boolean) {
    setEnabledState(next);
    writePersisted(next);
  }

  return (
    <HapticsContext.Provider value={{ enabled, setEnabled }}>{children}</HapticsContext.Provider>
  );
}
