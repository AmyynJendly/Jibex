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
  /** "In Transit" filled-chip color — the design's darker clay tone, distinct from `accent` and `warning`. */
  info: string;
  infoSoft: string;
}

/**
 * "Sunlit" theme — clay-and-sand surfaces, warm cream backgrounds, ink-stamp
 * accents (Claude Design project 6f820bf5-c67c-4e8a-8512-4f2c82bf319d,
 * "Jibex Box theme.dc.html"). Values below are lifted directly from that
 * source's light palette.
 *
 * The source design only defines ONE palette (its `renderVals()` hardcodes
 * `light: false`, i.e. an always-warm-cream UI — the only true dark surface
 * shown anywhere is the Scanner screen, which every screen in the app has
 * always rendered forced-dark regardless of system theme). Since this app
 * still needs to support `useColorScheme()`-driven dark mode, the `dark`
 * palette below is derived (not lifted) — anchored to the Scanner screen's
 * real colors (`#2E3439` bg, `rgba(245,238,230,*)` text/borders, `#EAB464`
 * accent) and extended using the same light/dark relationship the previous
 * palette had, rather than inventing new hues.
 */
export const palette: { light: ColorPalette; dark: ColorPalette } = {
  light: {
    bg: '#F5EEE6',
    bgElevated: '#FFFCF8',
    text: '#2E3439',
    textSecondary: '#646E78',
    textTertiary: '#8D98A7',
    separator: '#E9DDCE',
    // The design has no backdrop-blur glass anywhere — chrome (icon buttons,
    // tab bar) is opaque clay-white cards. `glassTint` stays a real (if
    // near-opaque) alpha rather than a flat color so `GlassSurface` still
    // renders through native `GlassView`/`BlurView`, just tinted to read as
    // solid, matching the design without restructuring every call site.
    glassTint: 'rgba(255,252,248,0.92)',
    glassTintStrong: 'rgba(255,252,248,0.97)',
    glassBorder: 'rgba(228,214,198,0.9)',
    accent: '#A7754D',
    accentSoft: '#F7E7D2',
    // The design renders "delivered/done" states in neutral ink-gray, not
    // green — there is no green anywhere in this palette.
    success: '#646E78',
    successSoft: '#EDEAE4',
    // The design's only red-family swatch, used for "Se déconnecter" — the
    // one negative/destructive accent in an otherwise all-warm-neutral
    // palette. Reused here for error text/failed badges/end-shift, which
    // need a distinct "problem" color the source doesn't otherwise supply.
    danger: '#B4564E',
    dangerSoft: 'rgba(180,86,78,0.12)',
    // No purple/lavender exists in this palette — aliased to accent, same
    // as how the design itself colors the Pickups quick-action count badge.
    purple: '#A7754D',
    purpleSoft: '#F7E7D2',
    // Gold — the design's "urgent / live / needs attention" highlight
    // (pulsing dots, priority alerts, next-stop borders).
    warning: '#EAB464',
    warningSoft: 'rgba(234,180,100,0.18)',
    neutral: '#8D98A7',
    neutralSoft: '#E6E7E4',
    // Darker clay — the design's "in transit / active" filled-chip color,
    // kept distinct from `warning` gold and `accent` clay-brown.
    info: '#96683F',
    infoSoft: 'rgba(150,104,63,0.14)',
  },
  dark: {
    bg: '#2E3439',
    bgElevated: '#3E464C',
    text: '#F5EEE6',
    textSecondary: 'rgba(245,238,230,0.6)',
    textTertiary: 'rgba(245,238,230,0.3)',
    separator: 'rgba(245,238,230,0.16)',
    glassTint: 'rgba(245,238,230,0.12)',
    glassTintStrong: 'rgba(245,238,230,0.18)',
    glassBorder: 'rgba(245,238,230,0.2)',
    accent: '#EAB464',
    accentSoft: 'rgba(234,180,100,0.2)',
    success: '#8D98A7',
    successSoft: 'rgba(141,152,167,0.16)',
    danger: '#D97B72',
    dangerSoft: 'rgba(217,123,114,0.18)',
    purple: '#EAB464',
    purpleSoft: 'rgba(234,180,100,0.2)',
    warning: '#EAB464',
    warningSoft: 'rgba(234,180,100,0.2)',
    neutral: '#8D98A7',
    neutralSoft: 'rgba(141,152,167,0.18)',
    info: '#C99A6D',
    infoSoft: 'rgba(201,154,109,0.18)',
  },
};

/** Resolves to the light or dark palette based on the system color scheme. */
export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  return palette[scheme === 'dark' ? 'dark' : 'light'];
}
