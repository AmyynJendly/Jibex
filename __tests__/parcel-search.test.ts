/**
 * Search on the phone: through the parcels the app has already loaded, by
 * tracking number or customer name — never a server lookup. The same
 * function serves mock and real mode, so both are checked here.
 */
import { findExact, searchParcels, type LoadedParcels } from '../lib/parcelSearch';
import type { Job, Pickup, Return, Transfer } from '../types';

function job(id: string, customerName: string, status: Job['status'] = 'PENDING'): Job {
  return {
    id,
    customerName,
    customerPhone: '',
    address: '',
    packageInfo: { count: 1, weightKg: 1, fragile: false },
    status,
    cashToCollect: 0,
    callAttempts: 0,
  };
}

const PICKUP: Pickup = {
  id: 'PU-7',
  businessName: 'Boutique Ines',
  address: '',
  status: 'SCHEDULED',
  requestedByDate: '',
  timeWindow: '',
  packageCount: 1,
  contactName: '',
  contactPhone: '',
  parcels: [{ trackingNumber: 'TRK-PPPP0003', contactName: 'Hédi Trabelsi', address: '', codAmount: 0 }],
};

const TRANSFER: Transfer = {
  id: 'TRF-0009',
  status: 'IN_PROGRESS',
  originAgency: 'Agence Sousse',
  destinationAgency: 'Agence Sfax',
  parcelCount: 1,
  location: '',
  scheduledAt: '',
  server: {
    transferId: '9',
    parcelTrackingNumbers: ['TRK-TTTT0004'],
    scanDeparture: false,
    scanArrival: false,
    missingParcels: 0,
    extraParcels: 0,
    damagedParcels: 0,
  },
};

const RETURN: Return = {
  id: 'TRK-RRRR0005',
  status: 'PROCESSED',
  fromAgency: 'Agence Tunis',
  toAgency: 'Boutique Kamel',
  parcelCount: 1,
  location: '',
  scheduledAt: '',
  server: { parcelId: '5', trackingNumber: 'TRK-RRRR0005', senderName: 'Boutique Kamel' },
};

const LOADED: LoadedParcels = {
  active: [job('TRK-AAAA0001', 'Amine Ben Salah')],
  history: [job('TRK-HHHH0002', 'Sarra Gharbi', 'DELIVERED')],
  pickups: [PICKUP],
  transfers: [TRANSFER],
  returns: [RETURN],
};

describe('local search: found in each source', () => {
  it('a current runsheet parcel opens its stop screen', () => {
    const [hit] = searchParcels('TRK-AAAA0001', LOADED);
    expect(hit).toMatchObject({ source: 'runsheet', exact: true, target: { screen: 'job', jobId: 'TRK-AAAA0001' } });
  });

  it('a history parcel opens runsheet history on it', () => {
    const [hit] = searchParcels('trk-hhhh0002', LOADED);
    expect(hit).toMatchObject({
      source: 'history',
      target: { screen: 'runsheets', tab: 'history', focusId: 'TRK-HHHH0002' },
    });
  });

  it('a pickup’s parcel opens that pickup, naming the shop', () => {
    const [hit] = searchParcels('TRK-PPPP0003', LOADED);
    expect(hit).toMatchObject({
      source: 'pickup',
      name: 'Hédi Trabelsi',
      context: 'Boutique Ines',
      target: { screen: 'pickups', tab: 'SCHEDULED', focusId: 'PU-7' },
    });
  });

  it('a parcel inside a transfer — and the transfer itself — open the transfer', () => {
    expect(searchParcels('TRK-TTTT0004', LOADED)[0]).toMatchObject({
      source: 'transfer',
      target: { screen: 'transfers', tab: 'current', focusId: 'TRF-0009' },
    });
    expect(searchParcels('TRF-0009', LOADED)[0]).toMatchObject({ source: 'transfer', exact: true });
  });

  it('a return opens returns history once it has been handed back', () => {
    const [hit] = searchParcels('TRK-RRRR0005', LOADED);
    expect(hit).toMatchObject({
      source: 'return',
      target: { screen: 'returns', tab: 'history', focusId: 'TRK-RRRR0005' },
    });
  });
});

describe('local search: matching', () => {
  it('matches a customer name, ignoring case and accents', () => {
    expect(searchParcels('hedi', LOADED).map((h) => h.trackingNumber)).toEqual(['TRK-PPPP0003']);
    expect(searchParcels('SARRA', LOADED).map((h) => h.trackingNumber)).toEqual(['TRK-HHHH0002']);
  });

  it('matches part of a tracking number from 3 characters, exact matches first', () => {
    expect(searchParcels('0004', LOADED).map((h) => h.trackingNumber)).toEqual(['TRK-TTTT0004']);
    // Two digits: too short for part of a tracking number, and not a name.
    expect(searchParcels('00', LOADED)).toEqual([]);
    const withPartial = searchParcels('TRK-AAAA0001', { ...LOADED, history: [job('TRK-AAAA00012', 'Other')] });
    expect(withPartial.map((h) => [h.trackingNumber, h.exact])).toEqual([
      ['TRK-AAAA0001', true],
      ['TRK-AAAA00012', false],
    ]);
  });

  it('a scan only takes exact tracking numbers', () => {
    expect(findExact('AAAA', LOADED)).toEqual([]);
    expect(findExact('TRK-AAAA0001', LOADED)).toHaveLength(1);
  });
});

describe('local search: not found', () => {
  it('finds nothing for a parcel that is not the driver’s', () => {
    expect(searchParcels('TRK-ZZZZ9999', LOADED)).toEqual([]);
    expect(searchParcels('Nobody Here', LOADED)).toEqual([]);
  });

  it('searches only what has loaded, and nothing when nothing has', () => {
    expect(searchParcels('TRK-AAAA0001', {})).toEqual([]);
    expect(searchParcels('', LOADED)).toEqual([]);
  });
});

describe('local search on mock data', () => {
  beforeEach(() => {
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  });

  it('finds the mock parcels in each list, and nothing else', async () => {
    let api!: typeof import('../services/mock-api');
    jest.isolateModules(() => {
      api = require('../services/mock-api');
    });
    const loaded: LoadedParcels = {
      active: await api.getActiveParcels(),
      history: await api.getHistoryParcels(),
      pickups: await api.getPickups(),
      transfers: await api.getTransfers(),
      returns: await api.getReturns(),
    };
    const pickupParcel = loaded.pickups![0].parcels[0].trackingNumber;
    const sourceOf = (query: string) => searchParcels(query, loaded)[0]?.source;
    expect(sourceOf('TRK-5DF3697E')).toBe('runsheet');
    expect(sourceOf('TRK-1F4A7D93')).toBe('history');
    expect(sourceOf(pickupParcel)).toBe('pickup');
    expect(sourceOf('TR-9201')).toBe('transfer');
    expect(sourceOf('RET-6601')).toBe('return');
    expect(sourceOf('Amine Ben')).toBe('runsheet');
    expect(searchParcels('TRK-00000000', loaded)).toEqual([]);
  });
});
