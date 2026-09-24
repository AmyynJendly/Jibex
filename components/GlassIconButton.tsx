import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { GlassSurface } from './GlassSurface';

interface GlassIconProps {
  /** @default 44 */
  size?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Forces dark glass chrome regardless of system theme (e.g. the Scanner screen). */
  forceDark?: boolean;
}

interface GlassIconButtonProps extends GlassIconProps {
  onPress: () => void;
  /**
   * Spoken name for the button. These are icon-only, so without one a screen
   * reader announces "button" and nothing else — required, not optional.
   */
  accessibilityLabel: string;
}

function GlassCircle({ size = 44, children, style, forceDark = false }: GlassIconProps) {
  return (
    <GlassSurface
      style={[styles.fill, { borderRadius: size / 2 }, style]}
      tint={forceDark ? 'dark' : undefined}
      colorScheme={forceDark ? 'dark' : undefined}>
      {children}
    </GlassSurface>
  );
}

/** Circular glass icon button — back buttons, notification bell, scanner shortcut, social login. */
export function GlassIconButton({ onPress, accessibilityLabel, ...circle }: GlassIconButtonProps) {
  const size = circle.size ?? 44;
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <GlassCircle {...circle} />
    </AnimatedPressable>
  );
}

/**
 * The same glass circle with no press handling of its own — for when
 * something native owns the tap, like the trigger of a system menu. It lets
 * touches through rather than competing for them.
 */
export function GlassIcon(circle: GlassIconProps) {
  const size = circle.size ?? 44;
  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <GlassCircle {...circle} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
