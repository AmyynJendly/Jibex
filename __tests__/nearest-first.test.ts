/**
 * "Nearest first" without parcel coordinates: each parcel is placed at the
 * centre of its governorate (from the server's recipientCity), and the list
 * is sorted by distance from the driver. Nothing here talks to jibex.cloud.
 */
import { GOVERNORATES, GOVERNORATE_CENTERS, governorateOfCity } from '../lib/governorates';
import { nearestFirstByArea } from '../lib/route';
import type { Job } from '../types';

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

describe('governorate matching', () => {
  it('takes the part before the comma of recipientCity', () => {
    expect(governorateOfCity('Kasserine, Mejel Bel Abbès')).toBe('Kasserine');
    expect(governorateOfCity('Tunis, Sidi Hassine')).toBe('Tunis');
    expect(governorateOfCity('Ariana, Raoued, hjh')).toBe('Ariana');
    // Only the governorate part counts: a delegation named like another
    // governorate doesn't move the parcel.
    expect(governorateOfCity('Monastir, Sousse Road')).toBe('Monastir');
  });

  it('ignores accents and case, and knows the common spellings', () => {
    for (const spelling of ['Médenine', 'Medenine', 'MEDENINE', 'Mednine']) {
      expect(governorateOfCity(`${spelling}, Midoun`)).toBe('Médenine');
    }
    expect(governorateOfCity('Beja')).toBe('Béja');
    expect(governorateOfCity('béja, Nefza')).toBe('Béja');
    expect(governorateOfCity('Gabes')).toBe('Gabès');
    expect(governorateOfCity('Kebili, Kébili Nord')).toBe('Kébili');
    expect(governorateOfCity('La Manouba, Oued Ellil')).toBe('Manouba');
    expect(governorateOfCity('El Kef')).toBe('Le Kef');
    expect(governorateOfCity('Ben-Arous, El Mourouj')).toBe('Ben Arous');
  });

  it('gives nothing for a city it can’t place', () => {
    expect(governorateOfCity('Somewhere, Tunis')).toBeUndefined();
    expect(governorateOfCity('')).toBeUndefined();
    expect(governorateOfCity(null)).toBeUndefined();
  });

  it('has a centre inside Tunisia for each of the 24 governorates', () => {
    expect(GOVERNORATES).toHaveLength(24);
    for (const name of GOVERNORATES) {
      const { lat, lng } = GOVERNORATE_CENTERS[name];
      expect(lat).toBeGreaterThan(30);
      expect(lat).toBeLessThan(37.6);
      expect(lng).toBeGreaterThan(7.5);
      expect(lng).toBeLessThan(11.7);
    }
  });
});

function parcel(id: string, recipientCity: string | undefined): Job {
  return {
    id,
    customerName: id,
    customerPhone: '',
    address: recipientCity ? `Rue 1, ${recipientCity}` : 'Rue 1',
    governorate: governorateOfCity(recipientCity),
    packageInfo: { count: 1, weightKg: 1, fragile: false },
    status: 'PENDING',
    cashToCollect: 0,
    callAttempts: 0,
  };
}

describe('sorting nearest first', () => {
  const inTunis = GOVERNORATE_CENTERS.Tunis;
  // Dispatch's order.
  const dispatch = [
    parcel('A-sfax', 'Sfax, Sakiet Ezzit'),
    parcel('B-tunis', 'Tunis, Sidi Hassine'),
    parcel('C-unknown', undefined),
    parcel('D-sousse', 'Sousse, Sahloul'),
    parcel('E-tunis', 'Tunis, Carthage'),
    parcel('F-medenine', 'Medenine, Midoun'),
  ];

  it('puts the nearest governorate first, keeps dispatch’s order inside one, and unknown ones last', () => {
    const sorted = nearestFirstByArea(dispatch, inTunis);
    expect(sorted.map((job) => job.id)).toEqual(['B-tunis', 'E-tunis', 'D-sousse', 'A-sfax', 'F-medenine', 'C-unknown']);
  });

  it('marks the distance as approximate — measured to the governorate centre', () => {
    const sorted = nearestFirstByArea(dispatch, inTunis);
    const sousse = sorted.find((job) => job.id === 'D-sousse')!;
    expect(sousse.distanceApprox).toBe(true);
    expect(Math.round(sousse.distanceKm!)).toBeGreaterThan(100);
    expect(Math.round(sousse.distanceKm!)).toBeLessThan(130);
    expect(sorted.find((job) => job.id === 'C-unknown')!.distanceKm).toBeUndefined();
  });

  it('uses a parcel’s own coordinates when it has them', () => {
    // Its governorate says Sfax, but it's actually right where the driver stands.
    const here = { lat: 36.9, lng: 10.3 };
    const exact = { ...parcel('G-exact', 'Sfax'), location: here };
    const [first] = nearestFirstByArea([...dispatch, exact], here);
    expect(first.id).toBe('G-exact');
    expect(first.distanceApprox).toBe(false);
  });
});

describe('"Nearest first" on real data', () => {
  type Api = typeof import('../services/real-api');
  type Position = typeof import('../lib/driverPosition');

  const DRIVER_ID = 31;
  const item = (id: number, tracking: string, recipientCity: string) => ({
    id,
    sequenceOrder: id,
    status: 'PENDING',
    parcel: { id: id + 1000, trackingNumber: tracking, recipientCity, price: 10, recipientLat: null, recipientLng: null },
  });
  const RUNSHEETS = [
    {
      id: 60,
      status: 'IN_PROGRESS',
      items: [
        item(1, 'TRK-SFAX', 'Sfax, Sakiet Ezzit'),
        item(2, 'TRK-TUNIS', 'Tunis, Sidi Hassine'),
        item(3, 'TRK-NOWHERE', 'Somewhere'),
        item(4, 'TRK-SOUSSE', 'Sousse, Sahloul'),
      ],
    },
  ];

  let urls: string[];
  async function app(position: Awaited<ReturnType<Position['driverPosition']>>) {
    let api!: Api;
    jest.isolateModules(() => {
      (require('../lib/driverPosition') as Position).setDriverLocator(async () => position);
      api = require('../services/real-api');
    });
    urls = [];
    globalThis.fetch = jest.fn((url: string) => {
      urls.push(url);
      const body = url.endsWith('/api/auth/login')
        ? { token: 't', role: 'DRIVER', user: { id: 7, driverId: DRIVER_ID, fullName: 'Driver', role: 'DRIVER', active: true } }
        : url.includes('/api/runsheets/driver/')
          ? RUNSHEETS
          : [];
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }) as unknown as typeof fetch;
    await api.login('driver', 'secret');
    return api;
  }

  beforeEach(() => {
    mockKeychain.clear();
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  });

  it('sorts by the driver’s position, with approximate distances', async () => {
    const api = await app({ coords: GOVERNORATE_CENTERS.Sousse });
    const parcels = await api.getActiveParcels();
    expect(parcels.map((job) => job.id)).toEqual(['TRK-SOUSSE', 'TRK-TUNIS', 'TRK-SFAX', 'TRK-NOWHERE']);
    expect(parcels[0]).toMatchObject({ governorate: 'Sousse', distanceApprox: true });
    // Home's next stop follows the same order.
    expect(await api.optimizeRouteOrder(parcels.map((job) => job.id))).toEqual(parcels.map((job) => job.id));
  });

  it('falls back to dispatch’s order when location is refused', async () => {
    const api = await app({ coords: null, problem: 'denied' });
    const parcels = await api.getActiveParcels();
    expect(parcels.map((job) => job.id)).toEqual(['TRK-SFAX', 'TRK-TUNIS', 'TRK-NOWHERE', 'TRK-SOUSSE']);
    expect(parcels.every((job) => job.distanceKm === undefined)).toBe(true);
  });

  it('dragging switches "Nearest first" off, and the saved order is kept', async () => {
    const api = await app({ coords: GOVERNORATE_CENTERS.Sousse });
    await api.setStopOrder(['TRK-NOWHERE', 'TRK-SFAX', 'TRK-TUNIS', 'TRK-SOUSSE']);
    const storage = require('@react-native-async-storage/async-storage').default;
    expect(await storage.getItem('jibex.device.nearestFirst.v1')).toBe('false');
    await new Promise((resolve) => setTimeout(resolve, 3_100)); // past the shared-fetch window
    expect((await api.getActiveParcels()).map((job) => job.id)).toEqual([
      'TRK-NOWHERE',
      'TRK-SFAX',
      'TRK-TUNIS',
      'TRK-SOUSSE',
    ]);
  });
});
