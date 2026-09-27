import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { DriverPosition, PositionProblem } from './driverPosition';
import type { GeoPoint } from './geo';

/**
 * Last known fix, shared across every screen that asks.
 *
 * Home and each job screen all want the driver's position, and they mount and
 * unmount constantly as the driver moves through the app. Without this, every
 * one of those mounts asked the OS for a fresh fix — seconds of waiting and a
 * radio wake-up each time, for a position that has barely changed. The first
 * caller pays for the lookup; the rest get it immediately.
 */
let cachedCoords: GeoPoint | null = null;
let inFlight: Promise<GeoPoint | null> | null = null;

/** A fix older than this is worth replacing — a driver covers ground. */
const MAX_AGE_MS = 60_000;
let fetchedAt = 0;

/** Longest wait for a fix before giving up — a list waiting on GPS must not hang. */
const FIX_TIMEOUT_MS = 10_000;

let lastProblem: PositionProblem | null = null;

async function resolveCoords(): Promise<GeoPoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
    status: 'denied' as const,
  }));
  if (status !== 'granted') {
    lastProblem = 'denied';
    return null;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), FIX_TIMEOUT_MS);
  });
  const position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    timeout,
  ]);
  clearTimeout(timer);
  if (!position) {
    lastProblem = 'unavailable';
    return null;
  }

  lastProblem = null;
  cachedCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
  fetchedAt = Date.now();
  return cachedCoords;
}

/**
 * One-shot capture for the moment something needs to record *where the
 * driver was*, rather than just display a live position — e.g. the GPS fix
 * attached to a failed-delivery reason, so dispatch can see the driver was
 * actually at the address when they logged "Customer absent". Reuses the
 * same cache/in-flight de-duplication as the hook below: if a screen already
 * has a fix from the last minute, this returns it instantly instead of
 * taking a fresh reading. Resolves to `null` on denied permission or an
 * unsupported platform (e.g. Expo web) — callers must treat the location as
 * optional and never block the action it's attached to on this resolving.
 */
export async function captureCurrentCoords(): Promise<GeoPoint | null> {
  const fresh = cachedCoords && Date.now() - fetchedAt < MAX_AGE_MS;
  if (fresh) return cachedCoords;

  inFlight = inFlight ?? resolveCoords().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * The driver's position for sorting, with the reason when there's none —
 * so a list can say *why* it fell back to dispatch's order. Foreground
 * permission only; shares the cache above.
 */
export async function locateDriver(): Promise<DriverPosition> {
  const coords = await captureCurrentCoords().catch(() => null);
  return coords ? { coords } : { coords: null, problem: lastProblem ?? 'unavailable' };
}

/**
 * Driver's real device GPS coordinates — resolves once permission is granted
 * and a fix is available, and stays `null` otherwise (denied, or unsupported
 * on this platform, e.g. Expo web). Callers should fall back to a reasonable
 * static reference point rather than blocking on this or fabricating a value.
 */
export function useLiveCoords(): GeoPoint | null {
  const [coords, setCoords] = useState<GeoPoint | null>(cachedCoords);

  useEffect(() => {
    let cancelled = false;

    const fresh = cachedCoords && Date.now() - fetchedAt < MAX_AGE_MS;
    if (fresh) return;

    // Concurrent mounts share one lookup instead of racing several.
    inFlight = inFlight ?? resolveCoords().finally(() => {
      inFlight = null;
    });

    inFlight.then((next) => {
      if (!cancelled && next) setCoords(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}
