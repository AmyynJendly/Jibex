import type { TextStyle } from 'react-native';

/** RN's "System" font resolves to SF Pro on iOS at no extra cost. */
const fontFamily = 'System';

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
  | 'cardTitle';

export const Typography: Record<TextStyleName, TextStyle> = {
  largeTitle: { fontFamily, fontSize: 34, fontWeight: '800', letterSpacing: -0.02 * 34 },
  title1: { fontFamily, fontSize: 28, fontWeight: '800', letterSpacing: -0.02 * 28 },
  title2: { fontFamily, fontSize: 22, fontWeight: '800', letterSpacing: -0.01 * 22 },
  title3: { fontFamily, fontSize: 19, fontWeight: '700' },
  headline: { fontFamily, fontSize: 17, fontWeight: '700' },
  body: { fontFamily, fontSize: 16, fontWeight: '500' },
  callout: { fontFamily, fontSize: 15, fontWeight: '500' },
  subhead: { fontFamily, fontSize: 14, fontWeight: '500' },
  footnote: { fontFamily, fontSize: 13, fontWeight: '600' },
  caption1: { fontFamily, fontSize: 12, fontWeight: '600' },
  caption2: { fontFamily, fontSize: 11, fontWeight: '600' },
  /** Typed values inside form fields — 17/500, distinct from `headline`'s 17/700. */
  input: { fontFamily, fontSize: 17, fontWeight: '500' },
  /** Section headers inside content cards ("Today's Deliveries") — 16/700. */
  cardTitle: { fontFamily, fontSize: 16, fontWeight: '700' },
};

/** Uppercase section labels ("TODAY", "ACCOUNT"): footnote + tracking + uppercase. */
export const sectionLabelStyle: TextStyle = {
  ...Typography.footnote,
  letterSpacing: 0.04 * 13,
  textTransform: 'uppercase',
};
