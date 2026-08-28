import { useColorScheme, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radii, Spacing, getCardShadow, useColors } from '../constants';

interface CardProps {
  children: React.ReactNode;
  /**
   * Colour of the rail down the leading edge — the card's status at a glance.
   * Omit for a card that carries no state of its own.
   */
  accent?: string;
  /** `tight` suits a dense row; `roomy` a card that holds its own sections. */
  padding?: 'tight' | 'roomy';
  /** Space between direct children. */
  gap?: number;
  /** A selected or otherwise called-out card. */
  borderColor?: string;
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The card every list in this app is built from.
 *
 * Runsheets, Pickups, Transfers and Returns had each grown their own copy of
 * the same block — same radius, same shadow, same 4pt status rail, same
 * `overflow: hidden` to clip it — which meant four places to edit for one
 * visual change, and four chances for them to drift apart. The rail in
 * particular has to be clipped by the card's own corner radius, which is easy
 * to get subtly wrong when it's rewritten per screen.
 */
export function Card({
  children,
  accent,
  padding = 'roomy',
  gap,
  borderColor,
  dimmed = false,
  style,
}: CardProps) {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <View
      style={[
        styles.card,
        padding === 'tight' ? styles.tight : styles.roomy,
        { backgroundColor: colors.bgElevated },
        gap !== undefined && { gap },
        borderColor && { borderColor, borderWidth: 1.5 },
        dimmed && styles.dimmed,
        getCardShadow(scheme),
        style,
      ]}>
      {accent && <View style={[styles.rail, { backgroundColor: accent }]} />}
      {children}
    </View>
  );
}

const RAIL_WIDTH = 4;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xxl,
    // Clips the rail to the rounded corner — without this it squares off the
    // leading edge.
    overflow: 'hidden',
  },
  roomy: {
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + RAIL_WIDTH,
  },
  tight: {
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    paddingLeft: Spacing.md + RAIL_WIDTH,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: RAIL_WIDTH,
  },
  dimmed: {
    opacity: 0.55,
  },
});
