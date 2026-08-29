import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Fonts, Radii, Spacing, Typography, getCardShadow, morphIn, useColors } from '../constants';
import { AnimatedPressable } from './AnimatedPressable';
import { PrimaryButton } from './PrimaryButton';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface ConfirmContextValue {
  /** Shows a blocking confirm dialog and resolves to whether the user confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Blocking Cancel/Confirm dialog — for actions (like zeroing a real total) that shouldn't fire on a single mis-tap. Native `Alert.alert` isn't usable here since it's a no-op on react-native-web. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function resolve(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => resolve(false)}>
        <View style={styles.backdropWrap}>
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => resolve(false)} />
          </Animated.View>
          {options && (
            <Animated.View
              entering={morphIn(0, 14)}
              style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow('light')]}>
              <Text style={[Typography.title3, { color: colors.text }]}>{options.title}</Text>
              <Text style={[Typography.subhead, styles.message, { color: colors.textSecondary }]}>
                {options.message}
              </Text>
              <View style={styles.actions}>
                <AnimatedPressable
                  scaleTo={0.96}
                  style={[styles.cancelButton, { backgroundColor: colors.bg }]}
                  onPress={() => resolve(false)}>
                  <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>
                    {options.cancelLabel}
                  </Text>
                </AnimatedPressable>
                <PrimaryButton
                  label={options.confirmLabel}
                  height={48}
                  style={styles.confirmButton}
                  onPress={() => resolve(true)}
                />
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  message: {
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
  },
});
