import { Stack } from 'expo-router';

import { useColors } from '../../../constants';
import { nativeHeaderOptions } from '../../../lib/nativeHeader';

/**
 * The stop screen keeps its own header (it zooms open from the card and
 * carries the stop number and menu); the camera and the success screen are
 * full-bleed. The two steps in between use Apple's navigation bar.
 */
export default function JobStackLayout() {
  const colors = useColors();
  const header = { ...nativeHeaderOptions(colors), title: '' };
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" options={header} />
      <Stack.Screen name="cant-deliver" options={header} />
      <Stack.Screen name="photo-proof" />
      <Stack.Screen name="cash-collected" />
    </Stack>
  );
}
