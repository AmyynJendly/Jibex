import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from 'expo-router';

import { Fonts, type ColorPalette } from '../constants';
import { supports } from './platformSupport';

const isIOS = Platform.OS === 'ios';

/**
 * Apple's own navigation bar for a pushed screen: the system back chevron,
 * the swipe-back gesture, and the push animation where the title and back
 * button travel with the page instead of sliding off inside it.
 *
 * On iOS the bar floats over the content (which scrolls underneath it): iOS
 * 26 draws its Liquid Glass edge there by itself, older iOS gets the classic
 * frosted bar. Android and web get a plain bar in the page color.
 *
 * Screens using it scroll with `contentInsetAdjustmentBehavior="automatic"`
 * so their content starts below the bar, and drop any top safe-area padding
 * of their own — the bar already accounts for it.
 */
export function nativeHeaderOptions(
  colors: ColorPalette,
  { largeTitle = false }: { largeTitle?: boolean } = {}
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerLargeTitleEnabled: isIOS && largeTitle,
    headerTransparent: isIOS,
    headerBlurEffect: isIOS && !supports.liquidGlass ? 'systemChromeMaterial' : undefined,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerTintColor: colors.accent,
    headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.bg },
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerTitleStyle: { fontFamily: Fonts.archivoBold, color: colors.text },
    headerLargeTitleStyle: { fontFamily: Fonts.archivoExtraBold, color: colors.text },
  };
}
