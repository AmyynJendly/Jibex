/**
 * Memory and battery.
 *
 *  - GPS: only for nearest-first and the failure note, one reading at a time,
 *    never in the background, never a continuous watch.
 *  - Camera: on only while the scanner is the screen in front and the app is
 *    open.
 */
const mockLocation = {
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 36.8, longitude: 10.18 } })),
  Accuracy: { Balanced: 3 },
};
jest.mock('expo-location', () => mockLocation);

import { cameraOn } from '../lib/cameraState';

// Node's own modules, without pulling Node's types into the app's type check.
interface Entry { name: string; isDirectory(): boolean }
const fs = require('fs') as {
  readdirSync(dir: string, options: { withFileTypes: true }): Entry[];
  readFileSync(file: string, encoding: 'utf8'): string;
};
const path = require('path') as { join(...parts: string[]): string };

type Coords = typeof import('../lib/useLiveCoords');

function fresh(): Coords {
  let mod!: Coords;
  jest.isolateModules(() => {
    mod = require('../lib/useLiveCoords');
  });
  return mod;
}

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

beforeEach(() => {
  mockLocation.requestForegroundPermissionsAsync.mockReset();
  mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockLocation.getCurrentPositionAsync.mockClear();
});

describe('GPS', () => {
  it('takes no reading until something needs one', () => {
    const coords = fresh();
    // What Home and the parcel screen read: the last fix, or nothing.
    expect(coords.lastKnownCoords()).toBeNull();
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('takes ONE reading for the failure note, then reuses it for a minute', async () => {
    const coords = fresh();
    const first = await coords.captureCurrentCoords();
    expect(first).toEqual({ lat: 36.8, lng: 10.18 });
    await coords.captureCurrentCoords();
    await coords.locateDriver();
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    // The screens that only display it now have it, at no extra cost.
    expect(coords.lastKnownCoords()).toEqual({ lat: 36.8, lng: 10.18 });
  });

  it('two requests at the same moment share one reading', async () => {
    const coords = fresh();
    await Promise.all([coords.captureCurrentCoords(), coords.locateDriver(), coords.captureCurrentCoords()]);
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('gives no position, not an error, when the driver refuses', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const coords = fresh();
    expect(await coords.captureCurrentCoords()).toBeNull();
    expect(await coords.locateDriver()).toMatchObject({ coords: null });
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('is never asked for in the background, and never watched continuously', () => {
    const root = process.cwd();
    const banned = /requestBackgroundPermissionsAsync|startLocationUpdatesAsync|watchPositionAsync|watchHeadingAsync|TaskManager/;
    const offenders = ['app', 'components', 'lib', 'services']
      .flatMap((dir) => sources(path.join(root, dir)))
      .filter((file) => banned.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('is only switched on by nearest-first and the failure note', () => {
    const root = process.cwd();
    const asks = /captureCurrentCoords\(|locateDriver\(|getCurrentPositionAsync\(/;
    const callers = ['app', 'components']
      .flatMap((dir) => sources(path.join(root, dir)))
      .filter((file) => asks.test(fs.readFileSync(file, 'utf8')))
      .map((file) => file.split(/[\\/]/).slice(-2).join('/'))
      .sort();
    // The two places a failure is recorded. Nearest-first asks through lib/driverPosition.
    expect(callers).toEqual(['[id]/cant-deliver.tsx', 'components/StatusUpdateSheet.tsx']);
  });

  it('tells iOS what the location is really used for', () => {
    const appJson = fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8');
    expect(appJson).not.toMatch(/track your route/);
    expect(appJson).toMatch(/only while the app is open/);
  });
});

describe('the scanner camera', () => {
  const on = { granted: true, done: false, focused: true, appActive: true };

  it('is on while the scanner is in front and the app is open', () => {
    expect(cameraOn(on)).toBe(true);
  });

  it('is off when another screen covers the scanner', () => {
    expect(cameraOn({ ...on, focused: false })).toBe(false);
  });

  it('is off in the background', () => {
    expect(cameraOn({ ...on, appActive: false })).toBe(false);
  });

  it('is off without permission, and once everything is scanned', () => {
    expect(cameraOn({ ...on, granted: false })).toBe(false);
    expect(cameraOn({ ...on, done: true })).toBe(false);
  });
});
