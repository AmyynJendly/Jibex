import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useColors } from '../../../constants';
import { nativeHeaderOptions } from '../../../lib/nativeHeader';

/** Apple's large-title bar; the screen sets its own translated title. */
export default function ProfileStackLayout() {
  const colors = useColors();
  return (
    // A tab's first page has nothing to go back to (the web bar would
    // otherwise offer a way back to the login screen).
    <Stack
      screenOptions={{
        ...nativeHeaderOptions(colors, { largeTitle: true }),
        headerBackVisible: false,
        ...(Platform.OS === 'web' && { headerLeft: () => null }),
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
