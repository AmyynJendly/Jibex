import { Platform, type ViewStyle } from 'react-native';

/**
 * RN can't express the design's multi-layer CSS box-shadow, so this is a
 * single-layer approximation of it: light mode is a soft, barely-there
 * card shadow; dark mode relies more on `bgElevated` contrast than shadow,
 * matching how the design's dark shadow is mostly invisible against #000.
 */
export function getCardShadow(scheme: 'light' | 'dark'): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: scheme === 'dark' ? 4 : 2 };
  }
  return scheme === 'dark'
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      }
    : {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      };
}

/**
 * The blue glow under primary pill buttons and the login logo badge. The
 * design hardcodes this as a literal `rgba(10,95,255,*)` in every screen
 * that uses it — it does not swap for the dark-mode accent color, so this
 * intentionally does not take a theme-dependent color as input.
 */
export function getAccentGlow(opacity = 0.3, radius = 24): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 6 };
  }
  return {
    shadowColor: '#0A5FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}
