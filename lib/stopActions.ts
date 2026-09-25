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

/** Where to drive: exact coordinates for a stop, or a street address for a pickup. */
export type Destination = { lat: number; lng: number } | { address: string };

/**
 * Driving directions in Google Maps — what drivers here use. Opens the
 * Google Maps app when it's installed (registered as a queryable scheme in
 * `app.json`), otherwise the Google Maps website, which still hands off to
 * the app via universal link if it's there.
 */
export async function openDirections(destination: Destination) {
  const target =
    'address' in destination
      ? encodeURIComponent(destination.address)
      : `${destination.lat},${destination.lng}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`;
  const appUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${target}&directionsmode=driving`,
    android: `google.navigation:q=${target}`,
  });

  if (appUrl && (await Linking.canOpenURL(appUrl).catch(() => false))) {
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
    return;
  }
  Linking.openURL(webUrl);
}

/** Driving directions to a stop. */
export function openInMaps(job: Job) {
  return openDirections(job.location);
}
