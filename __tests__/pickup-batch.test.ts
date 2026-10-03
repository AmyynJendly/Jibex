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
import { pickupBatch } from '../lib/pickupBatch';

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

  it('asks with the numbers: "Terminer N pickups (M colis) ?"', () => {
    expect(t('pickups.finishAllTitle', { count: 3, parcels: 12 })).toBe('Terminer 3 pickups (12 colis) ?');
    expect(t('pickups.finishAllTitle', { count: 1, parcels: 4 })).toBe('Terminer 1 pickup (4 colis) ?');
    expect(fr.pickups.finishAll).toBe('Terminer tous les pickups');
    expect(fr.pickups.finishAllConfirm).toBe('Confirmer');
    expect(fr.common.cancel).toBe('Annuler');
  });

  it('has nothing to finish on an empty list', () => {
    expect(pickupBatch([])).toEqual({ ids: [], count: 0, parcels: 0 });
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
