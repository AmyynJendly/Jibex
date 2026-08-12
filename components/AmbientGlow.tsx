import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface AmbientGlowProps {
  width: number;
  height: number;
  /** Three blob colors — defaults to the app's accent/purple/warning trio. */
  colors?: readonly [string, string, string];
  style?: StyleProp<ViewStyle>;
}

/**
 * Three soft, blurred color blobs that drift and breathe slowly behind quiet
 * moments (the login logo, empty states, success badges) — gives otherwise
 * static space a sense of depth and life without competing for attention.
 * Purely decorative: sits behind foreground content, never intercepts touch.
 */
export function AmbientGlow({ width, height, colors, style }: AmbientGlowProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    // Skia on web renders through a CanvasKit WASM build that isn't wired up
    // in this project's Metro web config — every animation frame throws
    // ("Cannot read properties of undefined (reading 'PictureRecorder')")
    // once CanvasKit fails to load. The real target here is iOS Expo Go,
    // where Skia runs natively and this is a non-issue, so this purely
    // decorative effect just skips itself on web rather than crash-looping.
    if (Platform.OS === 'web') return;
    t.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 9000, easing: Easing.linear }),
      -1,
      false
    );
  }, [t]);

  const [colorA, colorB, colorC] = colors ?? (['#0A5FFF', '#7C6FEE', '#FF9500'] as const);

  const cx1 = useDerivedValue(() => width * 0.35 + Math.sin(t.value) * width * 0.14);
  const cy1 = useDerivedValue(() => height * 0.4 + Math.cos(t.value * 0.8) * height * 0.12);
  const r1 = useDerivedValue(() => width * 0.32 + Math.sin(t.value * 1.3) * width * 0.03);

  const cx2 = useDerivedValue(() => width * 0.62 + Math.cos(t.value * 0.9 + 2) * width * 0.12);
  const cy2 = useDerivedValue(() => height * 0.35 + Math.sin(t.value * 0.7 + 2) * height * 0.14);
  const r2 = useDerivedValue(() => width * 0.26 + Math.cos(t.value * 1.1 + 1) * width * 0.03);

  const cx3 = useDerivedValue(() => width * 0.5 + Math.sin(t.value * 0.6 + 4) * width * 0.16);
  const cy3 = useDerivedValue(() => height * 0.65 + Math.cos(t.value * 0.85 + 4) * height * 0.1);
  const r3 = useDerivedValue(() => width * 0.24 + Math.sin(t.value * 0.9 + 3) * width * 0.03);

  // See the useEffect above — CanvasKit isn't wired up for web in this
  // project, so skip mounting the Canvas entirely there instead of crashing.
  if (Platform.OS === 'web') return null;

  return (
    // `opaque={false}` is required — Skia's Canvas defaults to an opaque
    // surface when the prop is omitted, which paints a solid background
    // rect behind the blobs (visible as a hard square around the glow).
    // `style` must be a flattened plain object, not an array — Skia's web
    // `Platform.View` spreads it directly into a CSS style object without
    // flattening, so an array's numeric indices ("0", "1") end up as
    // literal style keys, which crashes React DOM on web.
    <Canvas
      opaque={false}
      style={StyleSheet.flatten([{ width, height, pointerEvents: 'none' }, style])}>
      <Group>
        <Circle cx={cx1} cy={cy1} r={r1} color={colorA} opacity={0.5}>
          <BlurMask blur={30} style="normal" />
        </Circle>
        <Circle cx={cx2} cy={cy2} r={r2} color={colorB} opacity={0.4}>
          <BlurMask blur={30} style="normal" />
        </Circle>
        <Circle cx={cx3} cy={cy3} r={r3} color={colorC} opacity={0.35}>
          <BlurMask blur={30} style="normal" />
        </Circle>
      </Group>
    </Canvas>
  );
}
