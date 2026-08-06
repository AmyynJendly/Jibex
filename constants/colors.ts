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
  /** iOS systemGray — stop-number badges, secondary status chips. Same in both schemes (matches Apple's own systemGray, not extracted per-theme in the source). */
  neutral: string;
  neutralSoft: string;
  /** Fixed informational blue (`#0A84FF`) — "In Transit"/"Damaged" chips. Distinct from `accent` and non-adaptive, same as the design's literal. */
  info: string;
  infoSoft: string;
}

export const palette: { light: ColorPalette; dark: ColorPalette } = {
  light: {
    bg: '#F2F2F7',
    bgElevated: '#FFFFFF',
    text: '#000000',
    textSecondary: 'rgba(60,60,67,0.6)',
    textTertiary: 'rgba(60,60,67,0.3)',
    separator: 'rgba(60,60,67,0.12)',
    glassTint: 'rgba(255,255,255,0.55)',
    glassTintStrong: 'rgba(255,255,255,0.75)',
    glassBorder: 'rgba(0,0,0,0.06)',
    accent: '#0A5FFF',
    accentSoft: 'rgba(10,95,255,0.10)',
    success: '#1FAE5C',
    successSoft: 'rgba(31,174,92,0.12)',
    danger: '#FF3B30',
    dangerSoft: 'rgba(255,59,48,0.1)',
    purple: '#7C6FEE',
    purpleSoft: 'rgba(124,111,238,0.12)',
    warning: '#FF9500',
    warningSoft: 'rgba(255,149,0,0.12)',
    neutral: '#8E8E93',
    neutralSoft: 'rgba(142,142,147,0.16)',
    info: '#0A84FF',
    infoSoft: 'rgba(10,132,255,0.14)',
  },
  dark: {
    bg: '#000000',
    bgElevated: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: 'rgba(235,235,245,0.6)',
    textTertiary: 'rgba(235,235,245,0.3)',
    separator: 'rgba(84,84,88,0.65)',
    glassTint: 'rgba(120,120,128,0.28)',
    glassTintStrong: 'rgba(90,90,96,0.5)',
    glassBorder: 'rgba(255,255,255,0.14)',
    accent: '#3B82F6',
    accentSoft: 'rgba(59,130,246,0.20)',
    success: '#32D74B',
    successSoft: 'rgba(50,215,75,0.16)',
    danger: '#FF453A',
    dangerSoft: 'rgba(255,69,58,0.16)',
    purple: '#9F91F7',
    purpleSoft: 'rgba(159,145,247,0.20)',
    warning: '#FF9F0A',
    warningSoft: 'rgba(255,159,10,0.20)',
    neutral: '#8E8E93',
    neutralSoft: 'rgba(142,142,147,0.16)',
    info: '#0A84FF',
    infoSoft: 'rgba(10,132,255,0.14)',
  },
};

/** Resolves to the light or dark palette based on the system color scheme. */
export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  return palette[scheme === 'dark' ? 'dark' : 'light'];
}
