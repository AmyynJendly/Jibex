import { Stack } from 'expo-router';

export default function RunsheetsStackLayout() {
  return (
    <Stack>
      {/* Runsheets builds its own title/icon row instead of a native header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
