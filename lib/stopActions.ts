import { ActionSheetIOS, Linking, Platform } from 'react-native';

import { i18next } from './i18n';

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

type MapsApp = 'google' | 'apple' | 'waze';

function mapsUrls(app: MapsApp, destination: Destination) {
  const target =
    'address' in destination
      ? encodeURIComponent(destination.address)
      : `${destination.lat},${destination.lng}`;
  switch (app) {
    case 'google':
      return {
        app: Platform.select({
          ios: `comgooglemaps://?daddr=${target}&directionsmode=driving`,
          android: `google.navigation:q=${target}`,
        }),
        web: `https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`,
      };
    case 'apple':
      return { app: `maps://?daddr=${target}&dirflg=d`, web: `https://maps.apple.com/?daddr=${target}&dirflg=d` };
    case 'waze':
      return {
        app:
          'address' in destination
            ? `waze://?q=${target}&navigate=yes`
            : `waze://?ll=${target}&navigate=yes`,
        web: `https://waze.com/ul?${'address' in destination ? `q=${target}` : `ll=${target}`}&navigate=yes`,
      };
  }
}

/** Opens one maps app, falling back to its website if the app isn't there. */
async function openWith(app: MapsApp, destination: Destination) {
  const { app: appUrl, web } = mapsUrls(app, destination);
  if (appUrl && (await Linking.canOpenURL(appUrl).catch(() => false))) {
    Linking.openURL(appUrl).catch(() => Linking.openURL(web));
    return;
  }
  Linking.openURL(web);
}

/**
 * Driving directions, with the driver's choice of app.
 *
 * On iPhone this is Apple's own action sheet: Google Maps first (what drivers
 * here use), Apple Maps (always installed), and Waze when it's on the phone.
 * Android goes straight to Google Maps, as before. Each option falls back to
 * the app's website when the app itself isn't installed.
 */
export async function openDirections(destination: Destination) {
  if (Platform.OS !== 'ios') {
    openWith('google', destination);
    return;
  }

  const hasWaze = await Linking.canOpenURL('waze://').catch(() => false);
  const apps: MapsApp[] = hasWaze ? ['google', 'apple', 'waze'] : ['google', 'apple'];
  const names: Record<MapsApp, string> = { google: 'Google Maps', apple: 'Apple Maps', waze: 'Waze' };

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: i18next.t('maps.chooseTitle'),
      options: [...apps.map((app) => names[app]), i18next.t('common.cancel')],
      cancelButtonIndex: apps.length,
    },
    (index) => {
      const app = apps[index];
      if (app) openWith(app, destination);
    }
  );
}

/** Driving directions to a stop. */
export function openInMaps(job: Job) {
  return openDirections(job.location);
}
