import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

// A crash while this screen draws shows a message and "Réessayer", not a white screen.
export { ErrorBoundary } from '../../components/ScreenErrorBoundary';
