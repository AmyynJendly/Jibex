import { Stack } from 'expo-router';

/** Every screen in this flow builds its own glass/custom header, matching the design. */
export default function JobStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="cant-deliver" />
      <Stack.Screen name="photo-proof" />
      <Stack.Screen name="cash-collected" />
    </Stack>
  );
}
