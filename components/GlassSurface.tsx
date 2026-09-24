import { BlurView, type BlurTint } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  type GlassColorScheme,
  type GlassStyle,
} from 'expo-glass-effect';
import { StyleSheet, View, type ViewProps } from 'react-native';

type GlassSurfaceProps = ViewProps & {
  /** Liquid Glass style used on iOS 26+. */
  glassEffectStyle?: GlassStyle;
  /** Blur tint used on the fallback path (iOS < 26, Android, web). */
  tint?: BlurTint;
  /** Blur intensity used on the fallback path. */
  intensity?: number;
  /**
   * Forces light/dark glass appearance regardless of the system theme —
   * for surfaces like the Scanner screen that are always dark. Native-only
   * (`GlassView.colorScheme`); the BlurView fallback should instead pass an
   * explicit `tint` ('dark'/'light') to get the same effect.
   */
  colorScheme?: GlassColorScheme;
  /**
   * Tints the glass with a color (e.g. `colors.accent`) instead of neutral
   * system chrome — used for colored glass surfaces like primary buttons.
   * Passed natively to `GlassView.tintColor` on iOS 26+; on the BlurView
   * fallback path it's approximated with a translucent color wash over the
   * blur, since BlurView has no native tint-color concept.
   */
  tintColor?: string;
  /** Opacity of the fallback-path color wash. Ignored when real Liquid Glass is available. */
  tintOpacity?: number;
  /** Enables the native interactive glass response (press morph/ripple) on iOS 26+. */
  isInteractive?: boolean;
};

/**
 * Translucent surface for chrome (tab bars, headers, floating cards, buttons).
 *
 * Renders a real UIVisualEffectView Liquid Glass on iOS 26+, and falls back to
 * an expo-blur material everywhere else. Android needs `blurMethod` to blur
 * at all — without it BlurView is just a semi-transparent view.
 */
export function GlassSurface({
  glassEffectStyle = 'regular',
  tint = 'systemChromeMaterial',
  intensity = 80,
  tintColor,
  tintOpacity = 0.28,
  isInteractive = false,
  colorScheme,
  children,
  style,
  ...props
}: GlassSurfaceProps) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        colorScheme={colorScheme}
        style={style}
        {...props}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      tint={tint}
      intensity={intensity}
      blurMethod="dimezisBlurView"
      style={style}
      {...props}>
      {tintColor && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tintColor, opacity: tintOpacity, pointerEvents: 'none' },
          ]}
        />
      )}
      {children}
    </BlurView>
  );
}
