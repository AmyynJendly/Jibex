import 'react-native-reanimated';
import '../lib/i18n';

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryProvider } from '../lib/query';

import { ConfirmDialogProvider } from '../components/ConfirmDialog';
import { useColors } from '../constants';
import { OfflineBanner } from '../components/OfflineBanner';
import { ToastProvider } from '../components/Toast';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';
import { HapticsProvider } from '../lib/haptics';
import { NextStopBarProvider } from '../lib/nextStopBar';

// Without this the stack mounts `index` (the `/` -> `/login` redirect) beneath
// any deep link, and the redirect fires and clobbers the target route.
export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // The navigator paints its own layer behind every screen. Left on the
  // library default it was plain white, which showed around the edges while
  // a screen zoomed or slid in — glaring in dark mode. It now uses the app's
  // own light/dark colours.
  const colors = useColors();
  const baseTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.bg,
      card: colors.bgElevated,
      text: colors.text,
      border: colors.separator,
      primary: colors.accent,
    },
  };

  // Every screen's `Typography`/`monoStyle` names one of these font families
  // directly (not `fontWeight`, since custom TTFs aren't a single variable
  // family) — so nothing should render until they're actually loaded.
  if (!fontsLoaded) return null;

  return (
    // Gesture handler needs a root view above anything using a gesture, and
    // the navigators themselves rely on it.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <SafeAreaProvider>
          <QueryProvider>
            <LanguageProvider>
              <HapticsProvider>
                <NextStopBarProvider>
                  <ToastProvider>
                    <ConfirmDialogProvider>
                      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="job/[id]" />
                        {/* Pickups/Transfers/Returns each build their own glass back-button header, matching the design. */}
                        <Stack.Screen name="pickups" />
                        <Stack.Screen name="transfers" />
                        <Stack.Screen name="returns" />
                        <Stack.Screen name="personal-info" />
                        <Stack.Screen name="vehicle-details" />
                        <Stack.Screen name="help-center" />
                        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
                        <Stack.Screen name="search" />
                      </Stack>
                      <OfflineBanner />
                      <StatusBar style="auto" />
                    </ConfirmDialogProvider>
                  </ToastProvider>
                </NextStopBarProvider>
              </HapticsProvider>
            </LanguageProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
