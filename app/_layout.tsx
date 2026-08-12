import 'react-native-reanimated';
import '../lib/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '../components/OfflineBanner';
import { ToastProvider } from '../components/Toast';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';

// Without this the stack mounts `index` (the `/` -> `/login` redirect) beneath
// any deep link, and the redirect fires and clobbers the target route.
export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="job/[id]" />
            {/* Pickups/Transfers/Returns each build their own glass back-button header, matching the design. */}
            <Stack.Screen name="pickups" />
            <Stack.Screen name="transfers" />
            <Stack.Screen name="returns" />
            <Stack.Screen name="availability" />
            <Stack.Screen name="runsheet-schedule" />
            <Stack.Screen name="personal-info" />
            <Stack.Screen name="vehicle-details" />
            <Stack.Screen name="bank-info" />
            <Stack.Screen name="help-center" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="shift-summary" options={{ gestureEnabled: false }} />
            <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="search" />
          </Stack>
          <OfflineBanner />
          <StatusBar style="auto" />
        </ToastProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
