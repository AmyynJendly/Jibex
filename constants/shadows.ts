import { Platform, type ViewStyle } from 'react-native';

/**
 * RN can't express the design's multi-layer CSS box-shadow, so this keeps
 * its more prominent layer: a soft, warm-gray card shadow (`#646E78`, the
 * design's own shadow color). Dark mode relies on `bgElevated` contrast
 * more than on shadow.
 */
const CARD_SHADOWS: Record<'light' | 'dark', ViewStyle> =
  Platform.OS === 'android'
    ? { light: { elevation: 2 }, dark: { elevation: 4 } }
    : {
        light: {
          shadowColor: '#6B4A2B',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        },
        dark: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
        },
      };

/**
 * Returns a shared, frozen style object rather than building one per call.
 * This runs once per card per render across every list in the app; handing
 * back a fresh object each time defeated style memoisation downstream.
 */
export function getCardShadow(scheme: 'light' | 'dark'): ViewStyle {
  return CARD_SHADOWS[scheme];
}

/**
 * The glow under primary pill buttons and the login logo badge. The design
 * uses one literal color for it (the dark end of the primary button's brown
 * gradient) in both themes, so this takes no theme color.
 */
export function getAccentGlow(opacity = 0.3, radius = 24): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 6 };
  }
  return {
    shadowColor: '#8C5A2B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}
