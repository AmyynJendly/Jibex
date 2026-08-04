import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack>
      {/* Home builds its own greeting/icon row instead of a native header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
