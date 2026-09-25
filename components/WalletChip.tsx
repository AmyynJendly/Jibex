import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { CountUpText } from './CountUpText';
import { Fonts } from '../constants';
import { CURRENCY_DECIMALS, formatDecimal } from '../lib/currency';

// Fixed colors, not theme-adaptive: the chip is the same dark leather pill in
// light and dark mode, like the cash card it replaces.
const CREAM = '#F5EEE6';
const LEATHER = '#EAB464';
const NOTE = '#9CC5A1';

interface WalletChipProps {
  amount: number;
  accessibilityLabel: string;
  onPress: () => void;
}

const formatAmount = (n: number) => formatDecimal(n, CURRENCY_DECIMALS);

/**
 * The driver's cash on hand, as a small wallet with the total beside it.
 *
 * A banknote sits tucked in the wallet. Drawn from plain views rather than
 * an SF Symbol, so it looks the same on every iPhone and iOS.
 */
export function WalletChip({ amount, accessibilityLabel, onPress }: WalletChipProps) {
  return (
    <AnimatedPressable
      scaleTo={0.95}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.pressable}>
      <LinearGradient
        colors={['#5A636D', '#3A4148']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chip}>
        <View style={styles.wallet}>
          <View style={styles.note}>
            <View style={styles.noteMark} />
          </View>
          <View style={styles.body}>
            <View style={styles.stitch} />
          </View>
          <View style={styles.flap}>
            <View style={styles.snap} />
          </View>
        </View>
        <View style={styles.amountRow}>
          <CountUpText value={amount} formatter={formatAmount} style={styles.amount} />
          <Text style={styles.currency}>TND</Text>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 20,
  },
  chip: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245,238,230,0.18)',
  },
  wallet: {
    width: 24,
    height: 21,
  },
  note: {
    position: 'absolute',
    top: 1,
    left: 3,
    width: 16,
    height: 10,
    borderRadius: 2,
    backgroundColor: NOTE,
    transform: [{ rotate: '-10deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteMark: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(46,52,57,0.45)',
  },
  body: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    borderRadius: 4,
    backgroundColor: LEATHER,
    justifyContent: 'center',
  },
  stitch: {
    marginHorizontal: 2.5,
    height: 11,
    borderRadius: 2.5,
    borderWidth: 0.75,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,52,57,0.35)',
  },
  flap: {
    position: 'absolute',
    bottom: 3.5,
    right: -1,
    width: 10,
    height: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 1.5,
    borderBottomRightRadius: 1.5,
    backgroundColor: '#C98F3E',
    justifyContent: 'center',
    paddingLeft: 2.5,
  },
  snap: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: CREAM,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  amount: {
    fontFamily: Fonts.dmMonoMedium,
    fontSize: 15,
    color: CREAM,
    fontVariant: ['tabular-nums'],
  },
  currency: {
    fontFamily: Fonts.dmMonoRegular,
    fontSize: 9,
    letterSpacing: 0.6,
    color: 'rgba(245,238,230,0.6)',
  },
});
