import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { Fonts, Radii, Spacing, useColors } from '../constants';

interface ExchangeCheckProps {
  checked: boolean;
  onToggle: () => void;
}

/**
 * Shown on an exchange parcel, wherever it can be marked delivered: what the
 * driver has to bring back, and the tick that says they have it. The delivery
 * stays blocked until it's ticked (see `lib/deliveryGate`).
 */
export function ExchangeCheck({ checked, onToggle }: ExchangeCheckProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.block, { backgroundColor: colors.warningSoft }]}>
      <View style={styles.head}>
        <Icon name="swap-horizontal-outline" size={16} color={colors.warning} />
        <Text style={[styles.title, { color: colors.warning }]}>{t('exchange.badge')}</Text>
      </View>
      <Text style={[styles.instruction, { color: colors.text }]}>{t('exchange.instruction')}</Text>
      <AnimatedPressable
        scaleTo={0.98}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={t('exchange.checkbox')}
        style={styles.checkRow}
        onPress={onToggle}>
        <View
          style={[
            styles.box,
            checked
              ? { backgroundColor: colors.success, borderColor: colors.success }
              : { borderColor: colors.textSecondary },
          ]}>
          {checked && <Icon name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={[styles.checkLabel, { color: colors.text }]}>{t('exchange.checkbox')}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.archivoBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  instruction: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 14,
    lineHeight: 19,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: Radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    flex: 1,
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 15,
  },
});
