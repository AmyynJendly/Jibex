import { Ionicons } from '@expo/vector-icons';
import { Image, type SFSymbolEffect } from 'expo-image';
import {
  Platform,
  type ColorValue,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { supports } from '../lib/platformSupport';
import type {
  SFSymbols1_0,
  SFSymbols1_1,
  SFSymbols2_0,
  SFSymbols2_1,
  SFSymbols2_2,
  SFSymbols3_0,
  SFSymbols3_1,
  SFSymbols3_2,
  SFSymbols3_3,
  SFSymbols4_0,
  SFSymbols4_1,
  SFSymbols4_2,
} from 'sf-symbols-typescript';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Every SF Symbol that ships with iOS 16.4 — the oldest iOS the app runs on
 * (Expo SDK 57). A newer symbol would draw nothing on an older iPhone, so the
 * table below can't name one without failing to compile.
 */
type AvailableSymbol =
  | SFSymbols1_0
  | SFSymbols1_1
  | SFSymbols2_0
  | SFSymbols2_1
  | SFSymbols2_2
  | SFSymbols3_0
  | SFSymbols3_1
  | SFSymbols3_2
  | SFSymbols3_3
  | SFSymbols4_0
  | SFSymbols4_1
  | SFSymbols4_2;

/**
 * The SF Symbol drawn for each Ionicons name the app uses. Outline glyphs map
 * to plain symbols and filled glyphs to `.fill`, matching Ionicons' weights.
 * Typed against the SF Symbols available on iOS 16.4, so a misspelt or too-new
 * symbol won't compile.
 */
const SF_SYMBOLS: Partial<Record<IconName, AvailableSymbol>> = {
  'alert-circle': 'exclamationmark.circle.fill',
  'alert-circle-outline': 'exclamationmark.circle',
  'arrow-forward': 'arrow.right',
  'arrow-undo-outline': 'arrow.uturn.backward',
  'backspace-outline': 'delete.left',
  'business-outline': 'building.2',
  'call-outline': 'phone',
  'camera-outline': 'camera',
  'car-outline': 'car',
  'card-outline': 'creditcard',
  'cash-outline': 'banknote',
  'chatbubble-outline': 'bubble.left',
  'chatbubbles-outline': 'bubble.left.and.bubble.right',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'checkmark-circle-outline': 'checkmark.circle',
  'checkmark-done': 'checklist.checked',
  'checkmark-done-outline': 'checklist.checked',
  'chevron-back': 'chevron.left',
  'chevron-down': 'chevron.down',
  'chevron-forward': 'chevron.right',
  'chevron-up': 'chevron.up',
  'clipboard-outline': 'list.bullet.clipboard',
  close: 'xmark',
  'close-circle-outline': 'xmark.circle',
  'cloud-offline-outline': 'wifi.slash',
  'cube-outline': 'shippingbox',
  'ellipse-outline': 'circle',
  'ellipsis-horizontal': 'ellipsis',
  'ellipsis-horizontal-circle-outline': 'ellipsis.circle',
  'eye-off-outline': 'eye.slash',
  'eye-outline': 'eye',
  'file-tray-outline': 'tray',
  'finger-print-outline': 'faceid',
  flashlight: 'flashlight.on.fill',
  'flashlight-outline': 'flashlight.off.fill',
  'git-branch-outline': 'arrow.triangle.branch',
  'globe-outline': 'globe',
  'help-circle-outline': 'questionmark.circle',
  home: 'house.fill',
  'home-outline': 'house',
  'information-circle': 'info.circle.fill',
  'information-circle-outline': 'info.circle',
  location: 'mappin',
  'location-outline': 'mappin.and.ellipse',
  'lock-closed': 'lock.fill',
  'lock-closed-outline': 'lock',
  'log-out-outline': 'rectangle.portrait.and.arrow.right',
  'map-outline': 'map',
  navigate: 'location.fill',
  'navigate-outline': 'location',
  notifications: 'bell.fill',
  'notifications-outline': 'bell',
  'person-outline': 'person',
  'phone-portrait-outline': 'iphone',
  scan: 'barcode.viewfinder',
  'scan-outline': 'barcode.viewfinder',
  search: 'magnifyingglass',
  'search-outline': 'magnifyingglass',
  'swap-horizontal-outline': 'arrow.left.arrow.right',
  'sync-outline': 'arrow.triangle.2.circlepath',
  'time-outline': 'clock',
  'trash-outline': 'trash',
  'volume-mute-outline': 'speaker.slash',
  warning: 'exclamationmark.triangle.fill',
};

/** The SF Symbol an icon draws as on iOS, for native views that take a symbol name. */
export function sfSymbolFor(name: IconName): AvailableSymbol | undefined {
  return SF_SYMBOLS[name];
}

interface IconProps {
  name: IconName;
  size: number;
  color: ColorValue;
  /** Positioning only (margins) — the icon's own size and color come from the props above. */
  style?: StyleProp<TextStyle>;
  /**
   * An SF Symbol animation (bounce, pulse…), iOS 17+. Older iPhones, Android,
   * web and anyone with Reduce Motion on see the same icon, still.
   */
  effect?: SFSymbolEffect;
}

/**
 * An icon named the Ionicons way, drawn as Apple's own SF Symbol on iOS (via
 * expo-image) so it matches the system's type and weight. Android, web, and
 * any name without a symbol in the table fall back to the Ionicon itself.
 */
export function Icon({ name, size, color, style, effect }: IconProps) {
  const reduceMotion = useReducedMotion();
  const symbol = Platform.OS === 'ios' ? SF_SYMBOLS[name] : undefined;
  if (!symbol) return <Ionicons name={name} size={size} color={color} style={style} />;
  return (
    <Image
      source={`sf:${symbol}`}
      tintColor={typeof color === 'string' ? color : undefined}
      style={[{ width: size, height: size }, style as StyleProp<ImageStyle>]}
      contentFit="contain"
      sfEffect={effect && supports.symbolEffects && !reduceMotion ? effect : null}
      accessible={false}
    />
  );
}
