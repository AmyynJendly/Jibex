import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from '../services/mock-api';

/**
 * Requests notification permission and registers the device's Expo push
 * token with the backend. Called when the driver starts a shift — that's
 * the natural moment they'd want to start receiving new-assignment alerts.
 *
 * `getExpoPushTokenAsync` needs an EAS project ID to resolve, which isn't
 * configured yet (no real backend to send from either) — this fails soft
 * rather than surfacing an error the driver can't do anything about.
 *
 * Remote push isn't supported in Expo Go as of SDK 53+, and every
 * `expo-notifications` call there logs a console warning about it. Bailing
 * out before touching the module avoids spamming those warnings on a client
 * that could never receive a push anyway — this becomes a no-op once the app
 * runs inside a real development/production build.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token);
  } catch {
    // No EAS project configured yet — see doc comment above.
  }
}
