import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '../constants';

interface CornerRibbonProps {
  label: string;
  color: string;
}

/**
 * Diagonal banner across a card's top-right corner, carrying the parcel's
 * state. Reads at a glance down a long list in a way a small inline chip
 * doesn't — the parent card must set `overflow: 'hidden'` so the ribbon's
 * ends are clipped by the card's rounded corner.
 */
export function CornerRibbon({ label, color }: CornerRibbonProps) {
  return (
    <View style={styles.clip} pointerEvents="none">
      <View style={[styles.band, { backgroundColor: color }]}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 92,
    height: 92,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    // Sized and offset so the rotated band spans the full corner diagonal.
    top: 17,
    right: -31,
    width: 130,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  label: {
    fontFamily: Fonts.archivoBold,
    fontSize: 9,
    letterSpacing: 0.05 * 9,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
