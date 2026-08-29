import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii, Spacing, Typography, exitUp, morphInDown, useColors } from '../constants';

interface ToastContextValue {
  /** Shows a transient, non-blocking status message — the honest placeholder for not-yet-built actions. */
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const DISPLAY_MS = 1800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const showToast = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(text);
    timeoutRef.current = setTimeout(() => setMessage(null), DISPLAY_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <View style={[styles.container, { top: insets.top + 8, pointerEvents: 'none' }]}>
          <Animated.View
            entering={morphInDown(0, 14)}
            exiting={exitUp()}
            style={[styles.pill, { backgroundColor: colors.text }]}>
            <Text style={[Typography.footnote, styles.text, { color: colors.bg }]}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pill: {
    borderRadius: Radii.full,
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.xl,
    maxWidth: '86%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  text: {
    fontFamily: Fonts.archivoSemiBold,
    textAlign: 'center',
  },
});
