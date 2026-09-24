import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Fonts, Radii, Spacing, Typography, getCardShadow, morphIn, useColors } from '../constants';
import { AnimatedPressable } from './AnimatedPressable';
import type { ConfirmDialogViewProps } from './ConfirmDialog.types';
import { PrimaryButton } from './PrimaryButton';

/** Drawn dialog for web and Android. iOS uses the system one (`.ios.tsx`). */
export function ConfirmDialogView({ options, onResolve }: ConfirmDialogViewProps) {
  const colors = useColors();

  return (
    <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => onResolve(false)}>
      <View style={styles.backdropWrap}>
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onResolve(false)} />
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
                onPress={() => onResolve(false)}>
                <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>
                  {options.cancelLabel}
                </Text>
              </AnimatedPressable>
              <PrimaryButton
                label={options.confirmLabel}
                height={48}
                style={styles.confirmButton}
                onPress={() => onResolve(true)}
              />
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
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
