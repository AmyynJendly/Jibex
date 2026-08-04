import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

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
    <Pressable onPress={onPress}>
      <GlassSurface
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}
        tint={forceDark ? 'dark' : undefined}
        colorScheme={forceDark ? 'dark' : undefined}>
        {children}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
