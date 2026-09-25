import { Platform } from 'react-native';

/** Major iOS version (e.g. 18), or 0 when not on iOS. */
export const iosMajorVersion =
  Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) || 0 : 0;

/**
 * Features newer than the app's floor (iOS 16.4, set by Expo SDK 57). Each is
 * checked here and nowhere else, so an older iPhone gets the plain version of
 * a screen instead of a missing or broken one.
 */
export const supports = {
  /** Long-press preview + menu on a link (iOS 13+, so every supported iPhone). */
  linkPreview: iosMajorVersion >= 13,
  /** Apple's zoom transition into a pushed screen. */
  zoomTransition: iosMajorVersion >= 18,
  /** The tab bar's bottom accessory slot (Liquid Glass tab bars). */
  tabBarAccessory: iosMajorVersion >= 26,
};
