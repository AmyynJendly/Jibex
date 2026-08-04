import { Stack } from 'expo-router';

export default function AlertsStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Notifications' }} />
    </Stack>
  );
}
