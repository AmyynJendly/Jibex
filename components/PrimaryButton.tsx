import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Typography, getAccentGlow, useColors } from '../constants';
import { AnimatedPressable } from './AnimatedPressable';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Design uses 54 on auth screens, 56 on the delivery flow. Radius is always height/2. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Overrides the default `headline` (17/700) label style — used by the compact 38pt variant. */
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * The main action pill used across the app (Log In, Confirm, Show QR, ...).
 *
 * Solid kraft with a soft shine along the top edge and the accent glow
 * underneath. It used to be tinted glass, which read as a faded clay button
 * — on iOS 26 the glass let the page through, and elsewhere the tint was a
 * light wash — so the one thing a driver has to tap never stood out.
 */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  height = 54,
  style,
  labelStyle,
}: PrimaryButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const radius = height / 2;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.97}
      style={[
        styles.button,
        {
          height,
          borderRadius: radius,
          backgroundColor: colors.accent,
          opacity: disabled && !loading ? 0.5 : 1,
        },
        getAccentGlow(),
        style,
      ]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
        locations={[0, 0.55]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[Typography.headline, { color: colors.onAccent }, labelStyle]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
