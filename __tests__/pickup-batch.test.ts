/**
 * "Terminer tous les pickups": every scheduled pickup at once, as the client
 * notes asked. It skips the parcel-by-parcel check, so it always asks first,
 * with the numbers — "Terminer N pickups (M colis) ?".
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { i18next } from '../lib/i18n';
import fr from '../lib/i18n/fr';
import { pickupBatch, pickupReference, pickupWhen } from '../lib/pickupBatch';

type MockApi = typeof import('../services/mock-api');

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

function freshMock(): MockApi {
  let api!: MockApi;
  jest.isolateModules(() => {
    api = require('../services/mock-api');
  });
  return api;
}

describe('finish all pickups', () => {
  const t = i18next.getFixedT('fr');

  it('counts the pickups still to do and all their parcels, leaving finished ones out', () => {
    const batch = pickupBatch([
      { id: '41', status: 'SCHEDULED', packageCount: 3 },
      { id: '42', status: 'SCHEDULED', packageCount: 9 },
      { id: '40', status: 'COMPLETED', packageCount: 5 },
    ]);
    expect(batch).toEqual({ ids: ['41', '42'], count: 2, parcels: 12 });
  });

  it('asks with the numbers: "Terminer N ramassages (M colis) ?"', () => {
    expect(t('pickups.finishAllTitle', { count: 3, parcels: 12 })).toBe('Terminer 3 ramassages (12 colis) ?');
    expect(t('pickups.finishAllTitle', { count: 1, parcels: 4 })).toBe('Terminer 1 ramassage (4 colis) ?');
    expect(fr.pickups.finishAll).toBe('Terminer tous les ramassages');
    expect(fr.pickups.check.finish).toBe('Terminer le ramassage');
    expect(fr.pickups.finishAllConfirm).toBe('Confirmer');
    expect(fr.common.cancel).toBe('Annuler');
  });

  it('has nothing to finish on an empty list', () => {
    expect(pickupBatch([])).toEqual({ ids: [], count: 0, parcels: 0 });
  });

  it('uses one French word everywhere: ramassage', () => {
    // Every French text, flattened. The only "pickup" left is the agency's own parcel status.
    const texts: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === 'string') texts.push(`${path}=${node}`);
      else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) walk(value, `${path}.${key}`);
    };
    walk(fr, 'fr');
    const stray = texts.filter((line) => /collecte|pickup/i.test(line.split('=').slice(1).join('=')));
    expect(stray).toEqual(['fr.enums.parcelStatus.PICKUP=Pickup']);
    expect(fr.pickups.headerTitle).toBe('Ramassages');
    expect(fr.common.nav.pickups).toBe('Ramassages');
    // The Home number counts only what is still to do, and says so.
    expect(fr.home.stats.pickups).toBe('À ramasser');
  });

  it('shows the agency’s reference and the day on a card', () => {
    // The agency's own reference, as the Android app shows it.
    expect(pickupReference({ id: '41', server: { pickupId: '41', requestNumber: 'PU-3-20261002-0001' } })).toBe('PU-3-20261002-0001');
    expect(pickupReference({ id: 'PU-3-20261002-0002' })).toBe('PU-3-20261002-0002');
    // A bare server id is not a reference.
    expect(pickupReference({ id: '41' })).toBeUndefined();
    expect(pickupWhen({ requestedByDate: '2026-10-02T23:13:00', timeWindow: '23:13' })).toBe('02/10 · 23:13');
    expect(pickupWhen({ requestedByDate: '', timeWindow: '23:13' })).toBe('23:13');
  });

  it('keeps "Tout cocher" on each pickup', () => {
    expect(fr.pickups.check.tickAll).toBe('Tout cocher');
  });

  it('closes every scheduled pickup on mock data, in one call', async () => {
    const api = freshMock();
    const batch = pickupBatch(await api.getPickups());
    expect(batch.count).toBeGreaterThan(1);

    const result = await api.completePickups(batch.ids);
    expect(result).toMatchObject({ success: true, succeeded: batch.ids, failed: [] });
    expect(pickupBatch(await api.getPickups()).count).toBe(0);
  });

  it('real server with writes off: sends nothing and says so', async () => {
    const real = require('../services/real-api') as typeof import('../services/real-api');
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const result = await real.completePickups(['41', '42']);
    expect(result).toMatchObject({ success: false, succeeded: [], failed: ['41', '42'] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
