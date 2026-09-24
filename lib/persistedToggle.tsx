import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

interface ToggleContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/**
 * An on/off preference that survives restarts — a context, its provider and
 * its hook. SecureStore has no web implementation, so web keeps it in
 * localStorage (same split as `LanguageProvider`).
 */
export function createPersistedToggle(storageKey: string, defaultValue: boolean) {
  const isWeb = Platform.OS === 'web';
  const Context = createContext<ToggleContextValue | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [enabled, setEnabledState] = useState(defaultValue);

    useEffect(() => {
      const read = isWeb
        ? Promise.resolve(localStorage.getItem(storageKey))
        : SecureStore.getItemAsync(storageKey);
      read.then((stored) => {
        if (stored !== null) setEnabledState(stored === '1');
      });
    }, []);

    function setEnabled(next: boolean) {
      setEnabledState(next);
      const raw = next ? '1' : '0';
      if (isWeb) localStorage.setItem(storageKey, raw);
      else SecureStore.setItemAsync(storageKey, raw);
    }

    return <Context.Provider value={{ enabled, setEnabled }}>{children}</Context.Provider>;
  }

  function useToggle() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`${storageKey} used outside its provider`);
    return ctx;
  }

  return { Provider, useToggle };
}
