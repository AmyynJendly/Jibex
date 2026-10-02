import { Linking, Platform } from 'react-native';

import { logCallAttempt } from '../services/api';
import type { Job } from '../types';
import { telUrl } from './phone';
import { invalidateDeliveryData } from './query';

/**
 * Calls the customer. The attempt is logged before dialling so it counts even
 * if the dialler never opens — a delivery is gated on it. Returns the parcel
 * with its updated call count.
 *
 * The call always goes through, connection or not: the attempt is saved on
 * the phone first, and re-reading the parcel afterwards is the only part
 * that needs the network. If that fails, the count is worked out here
 * instead of the whole call failing with an uncaught error.
 */
export async function callCustomer(job: Job): Promise<Job> {
  let updated: Job;
  try {
    updated = await logCallAttempt(job.id);
  } catch {
    updated = { ...job, callAttempts: job.callAttempts + 1, lastCallAt: new Date().toISOString() };
  }
  invalidateDeliveryData().catch(() => {});
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
  // No coordinates on the parcel: navigate by its street address instead.
  return openDirections(job.location ?? { address: job.address });
}
