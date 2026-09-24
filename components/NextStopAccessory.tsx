import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Fonts, Spacing, monoStyle, useColors } from '../constants';
import { formatCurrency } from '../lib/currency';
import type { Job } from '../types';
import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { PackageCube } from './PackageCube';

interface NextStopAccessoryProps {
  stop: Job;
  /** Position in the day's order, as the Home card shows it. */
  index: number;
}

/**
 * The next stop, pinned above the tab bar (iOS 26's bottom accessory — the
 * slot Apple Music uses for its mini player), so it's one tap away from any
 * tab. iOS draws two copies at once, one per placement, so everything comes
 * in as props rather than living in state here.
 *
 * `regular` sits above the full tab bar; `inline` squeezes in beside the
 * minimized bar while scrolling, where only the name fits.
 */
export function NextStopAccessory({ stop, index }: NextStopAccessoryProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const open = () => router.push({ pathname: '/job/[id]', params: { id: stop.id } });

  if (placement === 'inline') {
    return (
      <AnimatedPressable
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={`${t('home.nextStop.label')}: ${stop.customerName}`}
        style={styles.inline}
        onPress={open}>
        <Icon name="navigate" size={14} color={colors.accent} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {stop.customerName}
        </Text>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.nextStop.label')} ${index}: ${stop.customerName}, ${stop.address}`}
      style={styles.regular}
      onPress={open}>
      <PackageCube size={22} />
      <View style={styles.text}>
        <Text style={[monoStyle(10), styles.label, { color: colors.accent }]} numberOfLines={1}>
          {t('home.nextStop.label')}
          {index ? ` · ${index}` : ''}
        </Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {stop.customerName}
          <Text style={{ color: colors.textSecondary }}> · {stop.address}</Text>
        </Text>
      </View>
      {stop.cashToCollect > 0 && (
        <Text style={[monoStyle(13, 'medium'), { color: colors.text }]} numberOfLines={1}>
          {formatCurrency(stop.cashToCollect)}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  regular: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.lg,
  },
  inline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
});
