import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack>
      {/* Home builds its own greeting/icon row instead of a native header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

// A crash while this screen draws shows a message and "Réessayer", not a white screen.
export { ErrorBoundary } from '../../../components/ScreenErrorBoundary';
