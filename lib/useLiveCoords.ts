import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { GeoPoint } from './geo';

/**
 * Driver's real device GPS coordinates — resolves once permission is granted
 * and a fix is available, and stays `null` otherwise (denied, or unsupported
 * on this platform, e.g. Expo web). Callers should fall back to a reasonable
 * static reference point rather than blocking on this or fabricating a value.
 */
export function useLiveCoords(): GeoPoint | null {
  const [coords, setCoords] = useState<GeoPoint | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
        status: 'denied' as const,
      }));
      if (cancelled || status !== 'granted') return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (cancelled || !position) return;

      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}
