import { Stack } from 'expo-router';

export default function RunsheetsStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Runsheets' }} />
    </Stack>
  );
}
