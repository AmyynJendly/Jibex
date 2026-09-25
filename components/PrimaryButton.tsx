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
import { GlassSurface } from './GlassSurface';

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
 * The accent-tinted glass pill button used across nearly every screen in the
 * design (Log In, Continue, Start Delivery, Verify & Complete, ...).
 *
 * This is real tinted Liquid Glass (`GlassView` with `tintColor`) — the
 * vibrant color shows *through* translucency, not a flat gradient-over-solid
 * fake. The edge glow (`getAccentGlow`) and rim border are genuine shadow/
 * border effects layered on top, and a faint top specular gradient adds the
 * light-catching sheen real glass has — most visible on the BlurView
 * fallback path, where there's no native light response to rely on.
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
        { height, borderRadius: radius, opacity: disabled && !loading ? 0.5 : 1 },
        getAccentGlow(),
        style,
      ]}>
      <GlassSurface
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        tintColor={colors.accent}
        tintOpacity={0.9}
        glassEffectStyle="regular"
        isInteractive
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        locations={[0, 0.6]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[Typography.headline, styles.label, labelStyle]}>{label}</Text>
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
    borderColor: 'rgba(255,255,255,0.35)',
  },
  label: {
    color: '#fff',
  },
});
