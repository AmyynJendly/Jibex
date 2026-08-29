import type { TextStyle } from 'react-native';

/**
 * "Sunlit" theme fonts — Archivo for UI text/titles, DM Mono for numeric
 * readouts, codes, and uppercase tracking labels (currency, tracking IDs,
 * timestamps, OTP digits, stat numbers). Loaded via `@expo-google-fonts` in
 * `app/_layout.tsx`; each weight is its own font file/family (not a
 * variable font), so every style below names its exact loaded family
 * rather than relying on `fontWeight` to pick a weight within one family.
 */
export const Fonts = {
  archivoRegular: 'Archivo_400Regular',
  archivoMedium: 'Archivo_500Medium',
  archivoSemiBold: 'Archivo_600SemiBold',
  archivoBold: 'Archivo_700Bold',
  archivoExtraBold: 'Archivo_800ExtraBold',
  archivoBlack: 'Archivo_900Black',
  dmMonoRegular: 'DMMono_400Regular',
  dmMonoMedium: 'DMMono_500Medium',
} as const;

const fontFamily = Fonts.archivoMedium;

type TextStyleName =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption1'
  | 'caption2'
  | 'input'
  | 'cardTitle'
  | 'pageTitle';

export const Typography: Record<TextStyleName, TextStyle> = {
  largeTitle: { fontFamily: Fonts.archivoExtraBold, fontSize: 34, letterSpacing: -0.02 * 34 },
  title1: { fontFamily: Fonts.archivoExtraBold, fontSize: 28, letterSpacing: -0.02 * 28 },
  title2: { fontFamily: Fonts.archivoExtraBold, fontSize: 22, letterSpacing: -0.01 * 22 },
  title3: { fontFamily: Fonts.archivoBold, fontSize: 19 },
  headline: { fontFamily: Fonts.archivoBold, fontSize: 17 },
  body: { fontFamily: Fonts.archivoMedium, fontSize: 16 },
  callout: { fontFamily: Fonts.archivoMedium, fontSize: 15 },
  subhead: { fontFamily: Fonts.archivoMedium, fontSize: 14 },
  footnote: { fontFamily: Fonts.archivoSemiBold, fontSize: 13 },
  caption1: { fontFamily: Fonts.archivoSemiBold, fontSize: 12 },
  caption2: { fontFamily: Fonts.archivoSemiBold, fontSize: 11 },
  /** Typed values inside form fields. */
  input: { fontFamily: Fonts.archivoMedium, fontSize: 17 },
  /** Section headers inside content cards ("Today's Deliveries"). */
  cardTitle: { fontFamily: Fonts.archivoBold, fontSize: 16 },
  /** Tab-root screen titles ("Runsheets", "Notifications", "Profile"). */
  pageTitle: { fontFamily: Fonts.archivoExtraBold, fontSize: 32, letterSpacing: -0.02 * 32 },
};

/** Uppercase section labels ("TODAY", "ACCOUNT"): footnote + tracking + uppercase. */
export const sectionLabelStyle: TextStyle = {
  ...Typography.footnote,
  letterSpacing: 0.04 * 13,
  textTransform: 'uppercase',
};

/**
 * DM Mono readouts — currency amounts, tracking/runsheet IDs, timestamps,
 * OTP digits, stat numbers. `weight` mirrors the two loaded DM Mono cuts.
 *
 * The explicit `lineHeight` matters more than it looks. Without one, a mono
 * number gets DM Mono's own vertical metrics while the Archivo label beside
 * it gets Archivo's, so the two sit on boxes of different heights and the
 * number reads as nudged off-centre — which is exactly what it looked like
 * in the profile stats, on the delivery-confirmation total, and anywhere
 * else a figure sat next to or above text. Pinning the box to a fixed ratio
 * of the font size makes every readout land where it's placed.
 *
 * `includeFontPadding: false` does the same job on Android, where the
 * platform adds its own extra leading on top of the line box.
 */
export function monoStyle(size: number, weight: 'regular' | 'medium' = 'regular'): TextStyle {
  return {
    fontFamily: weight === 'medium' ? Fonts.dmMonoMedium : Fonts.dmMonoRegular,
    fontSize: size,
    lineHeight: Math.round(size * 1.3),
    includeFontPadding: false,
  };
}

/** Uppercase DM Mono tracking labels ("TOURNÉE R-12", "DT À ENCAISSER"). */
export function monoLabelStyle(size = 10, letterSpacing = 0.16): TextStyle {
  return {
    ...monoStyle(size),
    letterSpacing: letterSpacing * size,
  };
}
