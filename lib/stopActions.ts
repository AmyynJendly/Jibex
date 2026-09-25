import { Linking, Platform } from 'react-native';

import { logCallAttempt } from '../services/mock-api';
import type { Job } from '../types';
import { telUrl } from './phone';
import { invalidateDeliveryData } from './query';

/**
 * Calls the customer. The attempt is logged before dialling so it counts even
 * if the dialler never opens — a delivery is gated on it. Returns the parcel
 * with its updated call count.
 */
export async function callCustomer(job: Job): Promise<Job> {
  const updated = await logCallAttempt(job.id);
  await invalidateDeliveryData();
  Linking.openURL(telUrl(job.customerPhone)).catch(() => {});
  return updated;
}

/**
 * Driving directions to the stop. Drivers here use Google Maps, not Apple
 * Maps — opens the Google Maps app when installed (registered as a queryable
 * scheme in `app.json`), otherwise the Google Maps web URL, which still opens
 * in the app via universal link if it's present.
 */
export async function openInMaps(job: Job) {
  const { lat, lng } = job.location;
  const label = encodeURIComponent(job.customerName);
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  const appUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&q=${label}&directionsmode=driving`,
    android: `google.navigation:q=${lat},${lng}`,
  });

  if (appUrl) {
    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    if (canOpen) {
      Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
      return;
    }
  }

  Linking.openURL(webUrl);
}
