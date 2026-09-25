import { useColorScheme } from 'react-native';

export interface ColorPalette {
  bg: string;
  bgElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  separator: string;
  glassTint: string;
  glassTintStrong: string;
  glassBorder: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  purple: string;
  purpleSoft: string;
  warning: string;
  warningSoft: string;
  /** Stop-number badges, secondary status chips ("Paid", "Closed", timestamp pills). */
  neutral: string;
  neutralSoft: string;
  /** "In Transit" filled-chip color — deep kraft, distinct from `accent` and `warning`. */
  info: string;
  infoSoft: string;
  /** Ink for text and icons sitting on an accent/filled surface. */
  onAccent: string;
  /** Ink readable on `warning` — the amber fills are too light for white. */
  onWarning: string;
  /** The wallet chip: dark on kraft paper, light in the dark warehouse. */
  inverseSurface: string;
  inverseText: string;
  inverseTextMuted: string;
}

/**
 * "Kraft & Tape" — the parcel depot, brighter. Cardboard kraft leads, packing
 * tape amber marks what needs attention, and delivered / failed read as
 * green and red ink stamps instead of two shades of gray. Cards are
 * shipping-label white on kraft paper; dark mode is a warehouse at night,
 * with dark-cardboard cards and the same tape and stamp colors, lifted so
 * they hold their contrast.
 *
 * Token names are unchanged from the earlier palette so every screen picks
 * the new colors up without edits; `purple` (Pickups) is now manifest blue.
 */
export const palette: { light: ColorPalette; dark: ColorPalette } = {
  light: {
    bg: '#F3E9DA',
    bgElevated: '#FFFDF8',
    text: '#1E2226',
    textSecondary: '#5F5850',
    textTertiary: '#8E8478',
    separator: '#E6D6BE',
    glassTint: 'rgba(255,253,248,0.92)',
    glassTintStrong: 'rgba(255,253,248,0.97)',
    glassBorder: 'rgba(230,214,190,0.9)',
    accent: '#B5793F',
    accentSoft: '#F6E4CC',
    success: '#2E8B57',
    successSoft: 'rgba(46,139,87,0.13)',
    danger: '#D6402C',
    dangerSoft: 'rgba(214,64,44,0.12)',
    purple: '#2F5DA8',
    purpleSoft: 'rgba(47,93,168,0.12)',
    warning: '#F2A516',
    warningSoft: 'rgba(242,165,22,0.18)',
    neutral: '#8E8478',
    neutralSoft: '#EDE4D6',
    info: '#8C5A2B',
    infoSoft: 'rgba(140,90,43,0.14)',
    onAccent: '#FFFFFF',
    onWarning: '#1E2226',
    inverseSurface: '#2B2621',
    inverseText: '#F6EEE2',
    inverseTextMuted: 'rgba(246,238,226,0.65)',
  },
  dark: {
    bg: '#1B1917',
    bgElevated: '#2A2622',
    text: '#F6EEE2',
    textSecondary: 'rgba(246,238,226,0.66)',
    textTertiary: 'rgba(246,238,226,0.38)',
    separator: 'rgba(246,238,226,0.13)',
    glassTint: 'rgba(246,238,226,0.1)',
    glassTintStrong: 'rgba(246,238,226,0.16)',
    glassBorder: 'rgba(246,238,226,0.18)',
    accent: '#D49A5E',
    accentSoft: 'rgba(212,154,94,0.2)',
    success: '#4CC38A',
    successSoft: 'rgba(76,195,138,0.16)',
    danger: '#FF6B55',
    dangerSoft: 'rgba(255,107,85,0.16)',
    purple: '#6E9BEA',
    purpleSoft: 'rgba(110,155,234,0.16)',
    warning: '#FFB627',
    warningSoft: 'rgba(255,182,39,0.16)',
    neutral: '#A89E91',
    neutralSoft: 'rgba(168,158,145,0.16)',
    info: '#D9A56E',
    infoSoft: 'rgba(217,165,110,0.16)',
    onAccent: '#1B1917',
    onWarning: '#1B1917',
    inverseSurface: '#F6EEE2',
    inverseText: '#1B1917',
    inverseTextMuted: 'rgba(27,25,23,0.6)',
  },
};

/** Resolves to the light or dark palette based on the system color scheme. */
export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  return palette[scheme === 'dark' ? 'dark' : 'light'];
}
