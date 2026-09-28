/**
 * Recent searches: parcels opened from Search stay listed when the driver
 * comes back — after a restart too — until removed or the driver signs out.
 * And every percentage shows two decimals.
 */
import { formatPercent } from '../lib/currency';

type Device = typeof import('../lib/deviceStore');

/** A fresh copy of the phone store, as after an app restart. */
function restart(): Device {
  let device!: Device;
  jest.isolateModules(() => {
    device = require('../lib/deviceStore');
  });
  return device;
}

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

describe('recent searches', () => {
  it('lists opened parcels newest first, and keeps them after a restart', async () => {
    const device = restart();
    await device.hydrateDeviceStore();
    await device.addRecentSearch({ trackingNumber: 'TRK-1', name: 'Amine' });
    await device.addRecentSearch({ trackingNumber: 'TRK-2', name: 'Sarra' });

    const later = restart();
    await later.hydrateDeviceStore();
    expect(later.recentSearches().map((item) => [item.trackingNumber, item.name])).toEqual([
      ['TRK-2', 'Sarra'],
      ['TRK-1', 'Amine'],
    ]);
  });

  it('opening one again moves it to the top instead of listing it twice', async () => {
    const device = restart();
    await device.hydrateDeviceStore();
    await device.addRecentSearch({ trackingNumber: 'TRK-1' });
    await device.addRecentSearch({ trackingNumber: 'TRK-2' });
    await device.addRecentSearch({ trackingNumber: 'TRK-1' });
    expect(device.recentSearches().map((item) => item.trackingNumber)).toEqual(['TRK-1', 'TRK-2']);
  });

  it('keeps the last ten', async () => {
    const device = restart();
    await device.hydrateDeviceStore();
    for (let i = 1; i <= 12; i++) await device.addRecentSearch({ trackingNumber: `TRK-${i}` });
    const kept = device.recentSearches().map((item) => item.trackingNumber);
    expect(kept).toHaveLength(10);
    expect(kept[0]).toBe('TRK-12');
    expect(kept).not.toContain('TRK-1');
  });

  it('the X removes one, and it stays removed', async () => {
    const device = restart();
    await device.hydrateDeviceStore();
    await device.addRecentSearch({ trackingNumber: 'TRK-1' });
    await device.addRecentSearch({ trackingNumber: 'TRK-2' });
    await device.removeRecentSearch('TRK-2');

    const later = restart();
    await later.hydrateDeviceStore();
    expect(later.recentSearches().map((item) => item.trackingNumber)).toEqual(['TRK-1']);
  });

  it('signing out clears them — they name customers', async () => {
    let api!: typeof import('../services/mock-api');
    let device!: Device;
    jest.isolateModules(() => {
      api = require('../services/mock-api');
      device = require('../lib/deviceStore');
    });
    await device.hydrateDeviceStore();
    await device.addRecentSearch({ trackingNumber: 'TRK-1', name: 'Amine' });
    await api.logout();
    expect(device.recentSearches()).toEqual([]);
  });
});

describe('percentages', () => {
  it('show two decimals', () => {
    expect(formatPercent(98.4)).toBe('98,40%');
    expect(formatPercent(100 / 3)).toBe('33,33%');
    expect(formatPercent(0)).toBe('0,00%');
  });
});
