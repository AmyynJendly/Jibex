import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { GlassSurface } from './GlassSurface';

interface GlassIconButtonProps {
  onPress: () => void;
  /** @default 44 */
  size?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Forces dark glass chrome regardless of system theme (e.g. the Scanner screen). */
  forceDark?: boolean;
}

/** Circular glass icon button — back buttons, notification bell, scanner shortcut, social login. */
export function GlassIconButton({
  onPress,
  size = 44,
  children,
  style,
  forceDark = false,
}: GlassIconButtonProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.9}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <GlassSurface
        style={[styles.fill, { borderRadius: size / 2 }, style]}
        tint={forceDark ? 'dark' : undefined}
        colorScheme={forceDark ? 'dark' : undefined}>
        {children}
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
