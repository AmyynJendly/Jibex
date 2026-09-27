import type { GeoPoint } from './geo';

/** Why there's no position: the driver said no, or the phone couldn't get one. */
export type PositionProblem = 'denied' | 'unavailable';

export interface DriverPosition {
  coords: GeoPoint | null;
  problem?: PositionProblem;
}

type Locator = () => Promise<DriverPosition>;

/**
 * Where the data layer asks for the driver's position ("Nearest first").
 *
 * The app plugs in the phone's GPS at start-up (app/_layout.tsx →
 * `locateDriver`); the services never import expo-location themselves, so
 * they stay plain modules that tests can load and feed a position of their
 * own. Until something is plugged in, there is no position.
 */
let locator: Locator = async () => ({ coords: null, problem: 'unavailable' });

export function setDriverLocator(next: Locator): void {
  locator = next;
}

export function driverPosition(): Promise<DriverPosition> {
  return locator().catch(() => ({ coords: null, problem: 'unavailable' as const }));
}
