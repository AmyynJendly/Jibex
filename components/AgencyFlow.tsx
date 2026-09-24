import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';
import { Fonts, Radii, Spacing, monoLabelStyle, useColors } from '../constants';

interface AgencyFlowProps {
  fromLabel: string;
  from: string;
  toLabel: string;
  to: string;
}

/**
 * The "who hands to whom" line shared by Transfers and Returns. Both screens
 * describe the same movement in opposite directions, so drawing them
 * identically means a driver reads one and already knows the other.
 */
export function AgencyFlow({ fromLabel, from, toLabel, to }: AgencyFlowProps) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <Text style={[monoLabelStyle(9, 0.1), { color: colors.textTertiary }]}>{fromLabel}</Text>
        <Text style={[styles.agency, { color: colors.text }]} numberOfLines={1}>
          {from}
        </Text>
      </View>

      <View style={[styles.arrow, { backgroundColor: colors.bg }]}>
        <Icon name="arrow-forward" size={14} color={colors.textSecondary} />
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <Text style={[monoLabelStyle(9, 0.1), { color: colors.textTertiary }]}>{toLabel}</Text>
        <Text style={[styles.agency, { color: colors.text }]} numberOfLines={1}>
          {to}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  side: {
    flex: 1,
    gap: 2,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agency: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
  },
});
