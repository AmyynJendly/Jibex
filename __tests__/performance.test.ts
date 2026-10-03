/**
 * Numbers for OPTIMIZATION.md, and the rule behind them:
 *
 *  - one request at a time per resource: when the 60 s timer, a tab getting
 *    focus and a pull-to-refresh all ask at the same moment, the server is
 *    asked once;
 *  - a long History stays cheap to build.
 *
 * The timings are printed, not asserted tightly: they depend on the machine.
 * Only generous ceilings are checked, to catch something going badly wrong.
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import { historyAttempts, historyRecordLine } from '../lib/historyRecord';
import { parcelRowKeys } from '../lib/rowKey';

type RealApi = typeof import('../services/real-api');

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const LOGIN = {
  token: 't', role: 'DRIVER', portal: '/driver',
  user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
};

/** `runs` closed runs of `perRun` parcels each: a few months of work. */
function closedRuns(runs: number, perRun: number) {
  return Array.from({ length: runs }, (_, r) => ({
    id: 1000 + r,
    code: 'RS-2026' + String(1000 + r),
    status: 'COMPLETED',
    scheduledDate: '2026-0' + (1 + (r % 9)) + '-' + String(1 + (r % 28)).padStart(2, '0'),
    completedAt: '2026-09-01T18:00:00',
    items: Array.from({ length: perRun }, (_, i) => ({
      id: r * perRun + i,
      sequenceOrder: i,
      status: i % 5 === 0 ? 'FAILED' : 'DELIVERED',
      failureReason: i % 5 === 0 ? 'ABSENT' : null,
      parcel: {
        // Every tenth parcel comes back on the next run, like a real re-attempt.
        id: i % 10 === 0 ? i : r * perRun + i,
        trackingNumber: 'TUN-100-' + String(i % 10 === 0 ? i : r * perRun + i).padStart(8, '0'),
        status: 'LIVRE',
        recipientName: 'Client',
        recipientAddress: 'Rue 1',
        recipientCity: 'Tunis, El Menzah',
        price: 10,
        deliveryAttempts: i % 10 === 0 ? r : 0,
      },
    })),
  }));
}

let urls: string[];
async function signedIn(all: unknown[] = [], delayMs = 0): Promise<RealApi> {
  let api!: RealApi;
  jest.isolateModules(() => {
    api = require('../services/real-api');
  });
  const slow = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), delayMs));
  globalThis.fetch = jest.fn(async (url: string) => {
    urls.push(url.replace('https://jibex.cloud', ''));
    if (url.endsWith('/api/auth/login')) return json(200, LOGIN);
    if (url.includes('/api/runsheets?driverId=')) return slow(await json(200, all));
    return slow(await json(200, []));
  }) as unknown as typeof fetch;
  await api.login('driver', 'secret');
  urls.length = 0;
  return api;
}

beforeEach(() => {
  urls = [];
  mockKeychain.clear();
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

const report = (line: string) => process.stdout.write('[perf] ' + line + '\n');

describe('one request at a time per resource', () => {
  it('three refreshes of the same list at the same moment ask the server once', async () => {
    const api = await signedIn([], 20);
    // The 60 s timer, the tab getting focus and a pull-to-refresh, together.
    await Promise.all([api.getPickups(), api.getPickups(), api.getPickups()]);
    await Promise.all([api.getTransfers(), api.getTransfers(), api.getTransfers()]);
    await Promise.all([api.getReturns(), api.getReturns(), api.getReturns()]);
    await Promise.all([api.getNotifications(), api.getNotifications(), api.getNotifications()]);
    const count = (part: string) => urls.filter((url) => url.includes(part)).length;
    const counts = {
      pickups: count('/api/pickup-requests/driver/'),
      transfers: count('/api/transfers/driver/'),
      returns: count('/api/return-management/'),
      notifications: count('/api/notifications/user/'),
    };
    report('requests for 3 simultaneous refreshes: ' + JSON.stringify(counts));
    expect(counts).toEqual({ pickups: 1, transfers: 1, returns: 1, notifications: 1 });
  });

  it('the whole Tournées tab (runs, parcels, history, numbers) costs two requests', async () => {
    const api = await signedIn(closedRuns(3, 5), 20);
    await Promise.all([
      api.getRunsheets(),
      api.getActiveParcels(),
      api.getHistoryParcels(),
      api.getDriverStats(),
      api.getClosedRunsheetsToday(),
      api.getRunsheets(),
      api.getHistoryParcels(),
    ]);
    report('requests to load the Tournées tab: ' + urls.length + ' (' + [...new Set(urls)].join(', ') + ')');
    expect(urls.filter((url) => url.includes('/active'))).toHaveLength(1);
    expect(urls.filter((url) => url.includes('?driverId='))).toHaveLength(1);
  });

  it('a list asked again after a write is fetched again — never a stale shared answer', async () => {
    const api = await signedIn([], 0);
    await api.getPickups();
    await api.getPickups();
    expect(urls.filter((url) => url.includes('/api/pickup-requests/driver/'))).toHaveLength(2);
  });
});

describe('a long History', () => {
  it('builds 2,000 rows from the server’s answer, and their card lines, quickly', async () => {
    const api = await signedIn(closedRuns(100, 20));
    const t0 = performance.now();
    const history = await api.getHistoryParcels();
    const t1 = performance.now();
    const attempts = historyAttempts(history);
    const keys = parcelRowKeys(history);
    const lines = history.map((job, index) => historyRecordLine(job, 'Tentative ' + attempts[index]));
    const t2 = performance.now();

    report('History, 2,000 rows: fetch + map ' + (t1 - t0).toFixed(1) + ' ms, attempts + keys + lines ' + (t2 - t1).toFixed(1) + ' ms');
    expect(history).toHaveLength(2000);
    expect(new Set(keys).size).toBe(2000);
    expect(lines).toHaveLength(2000);
    // Generous ceilings: a phone is slower than this machine, but not 20 times.
    expect(t1 - t0).toBeLessThan(1500);
    expect(t2 - t1).toBeLessThan(300);
  });
});

describe('a pickup with hundreds of parcels', () => {
  it('draws the first 30, then 30 more each time', () => {
    const { PARCELS_PAGE, parcelPage } = require('../lib/pickupBatch') as typeof import('../lib/pickupBatch');
    const parcels = Array.from({ length: 500 }, (_, i) => i);
    expect(PARCELS_PAGE).toBe(30);
    expect(parcelPage(parcels, PARCELS_PAGE)).toMatchObject({ hidden: 470 });
    expect(parcelPage(parcels, PARCELS_PAGE).visible).toHaveLength(30);
    expect(parcelPage(parcels, 60).visible).toHaveLength(60);
    // A small pickup shows everything, with nothing to expand.
    expect(parcelPage([1, 2, 3], PARCELS_PAGE)).toEqual({ visible: [1, 2, 3], hidden: 0 });
    expect(parcelPage(parcels, 9999).hidden).toBe(0);
  });
});
