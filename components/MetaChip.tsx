import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Fonts, Radii, Spacing, useColors } from '../constants';

interface MetaChipProps {
  icon: IconName;
  label: string;
  /** `accent` marks the one fact that matters most on the card — usually money. */
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

/**
 * One small labelled fact — a time window, a package count, a total. Lists
 * across the app carry different data but the same *kinds* of data, so they
 * all render it this way: a driver learns the shape once and reads every
 * screen with it.
 */
export function MetaChip({ icon, label, tone = 'neutral' }: MetaChipProps) {
  const colors = useColors();

  const palette = {
    neutral: { fg: colors.textSecondary, bg: colors.bg },
    accent: { fg: colors.accent, bg: colors.accentSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
  }[tone];

  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Icon name={icon} size={13} color={palette.fg} />
      <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.xs,
    flexShrink: 1,
  },
  label: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },
});
