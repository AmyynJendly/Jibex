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

/** Screens showing the last known position. They are told of a new fix; they never ask for one. */
const watchers = new Set<(coords: GeoPoint) => void>();

/** The last fix, if any, without asking the GPS for anything. */
export function lastKnownCoords(): GeoPoint | null {
  return cachedCoords;
}

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
  // Screens that only display the position learn of it here.
  const fix = cachedCoords;
  watchers.forEach((watcher) => watcher(fix));
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
 * The driver's last known position, for DISPLAY only (the place name on
 * Home, the distance to a stop). It never turns the GPS on.
 *
 * The GPS is used for two things only: sorting the stops nearest-first
 * (`locateDriver`) and stamping a failed delivery (`captureCurrentCoords`).
 * Home and the parcel screen used to take a reading of their own every time
 * they opened — many readings a day the driver never asked for. They now
 * show the last one of those two, and update when a new one comes in.
 * `null` until there has been one: callers fall back (the run's zone, no
 * distance) rather than waiting.
 */
export function useLiveCoords(): GeoPoint | null {
  const [coords, setCoords] = useState<GeoPoint | null>(cachedCoords);

  useEffect(() => {
    // A fix may have come in between the first render and this effect.
    if (cachedCoords) setCoords(cachedCoords);
    watchers.add(setCoords);
    return () => {
      watchers.delete(setCoords);
    };
  }, []);

  return coords;
}
