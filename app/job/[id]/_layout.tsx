import { Stack } from 'expo-router';

export default function JobStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Job Detail' }} />
      <Stack.Screen name="otp" options={{ title: 'Confirm Delivery' }} />
      <Stack.Screen name="cash-collected" options={{ headerShown: false }} />
    </Stack>
  );
}
