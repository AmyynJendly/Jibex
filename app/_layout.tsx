import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Without this the stack mounts `index` (the `/` -> `/login` redirect) beneath
// any deep link, and the redirect fires and clobbers the target route.
export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" />
        {/* Pickups builds its own glass back-button header, matching the design. */}
        <Stack.Screen name="pickups" />
        <Stack.Screen name="transfers" options={{ headerShown: true, title: 'Transfers' }} />
        <Stack.Screen name="returns" options={{ headerShown: true, title: 'Returns' }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
