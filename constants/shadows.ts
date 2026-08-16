import { Platform, type ViewStyle } from 'react-native';

/**
 * RN can't express the design's multi-layer CSS box-shadow (e.g.
 * `0 2px 3px rgba(46,52,57,0.04), 0 14px 30px rgba(100,110,120,0.1)`), so
 * this approximates it with the more prominent second layer — a soft,
 * warm-gray card shadow (`#646E78`, the design's own literal shadow color)
 * instead of the previous flat black. Dark mode still relies more on
 * `bgElevated` contrast than shadow, same reasoning as before.
 */
export function getCardShadow(scheme: 'light' | 'dark'): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: scheme === 'dark' ? 4 : 2 };
  }
  return scheme === 'dark'
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      }
    : {
        shadowColor: '#646E78',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      };
}

/**
 * The glow under primary pill buttons and the login logo badge. The design
 * hardcodes this as a literal `rgba(150,104,63,*)` (the dark end of the
 * primary button's brown gradient) in every screen that uses it — it does
 * not swap for the dark-mode accent color, so this intentionally does not
 * take a theme-dependent color as input, same as before.
 */
export function getAccentGlow(opacity = 0.3, radius = 24): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 6 };
  }
  return {
    shadowColor: '#96683F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}
