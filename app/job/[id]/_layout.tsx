import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useColors } from '../../../constants';
import { nativeHeaderOptions } from '../../../lib/nativeHeader';

/**
 * Apple's navigation bar across the stop's flow. The stop screen fills in
 * its own title, back button and menu (see its `Stack.Toolbar`); on the web
 * it keeps its drawn header. The receipt at the end stays full-bleed.
 */
export default function JobStackLayout() {
  const colors = useColors();
  const header = { ...nativeHeaderOptions(colors), title: '' };
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={Platform.OS === 'web' ? undefined : header} />
      <Stack.Screen name="cant-deliver" options={header} />
      <Stack.Screen name="photo-proof" options={header} />
      <Stack.Screen name="cash-collected" />
    </Stack>
  );
}
