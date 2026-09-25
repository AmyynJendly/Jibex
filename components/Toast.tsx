import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii, Spacing, Typography, exitUp, morphInDown, useColors } from '../constants';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastContextValue {
  /**
   * Shows a transient, non-blocking status message. With an `action` (e.g.
   * Undo) the toast becomes tappable and stays up long enough to reach it.
   */
  showToast: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const DISPLAY_MS = 1800;
/** Long enough to read the message and reach the button, short enough not to linger. */
export const ACTION_DISPLAY_MS = 4000;

interface ToastState {
  message: string;
  action?: ToastAction;
  /** Changes per toast so a replacement re-plays its entrance. */
  key: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const showToast = useCallback((text: string, action?: ToastAction) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message: text, action, key: Date.now() });
    timeoutRef.current = setTimeout(
      () => setToast(null),
      action ? ACTION_DISPLAY_MS : DISPLAY_MS
    );
  }, []);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View
          style={[
            styles.container,
            { top: insets.top + 8, pointerEvents: toast.action ? 'box-none' : 'none' },
          ]}>
          <Animated.View
            key={toast.key}
            entering={morphInDown(0, 14)}
            exiting={exitUp()}
            style={[styles.pill, toast.action && styles.pillWithAction, { backgroundColor: colors.text }]}>
            <Text style={[Typography.footnote, styles.text, { color: colors.bg }]}>
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}>
                <Text style={[Typography.footnote, styles.actionText, { color: colors.bg }]}>
                  {toast.action.label}
                </Text>
              </Pressable>
            )}
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
  pillWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  text: {
    fontFamily: Fonts.archivoSemiBold,
    textAlign: 'center',
  },
  actionText: {
    fontFamily: Fonts.archivoBold,
    textDecorationLine: 'underline',
  },
});
