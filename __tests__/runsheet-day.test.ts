/**
 * The run of the day, as the Current tab shows it.
 *
 * In the live test the agency closed the run ("Valider la tournée") and the
 * app only said "all packages done — nothing left to deliver": the active
 * endpoint stops listing a closed run. The closed run now comes from the
 * history endpoint and the tab says "Tournée clôturée par l'agence".
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import fr from '../lib/i18n/fr';
import { dayRuns, isRunForDay, runStage, runStatusKey } from '../lib/runsheetDay';
import type { Runsheet } from '../types';

type RealApi = typeof import('../services/real-api');

const TODAY = '2026-10-02';

function run(overrides: Partial<Runsheet> = {}): Runsheet {
  return {
    id: '72',
    code: 'RS-20261002-0001',
    zone: 'Tunis',
    agency: 'jihed agence',
    status: 'EN_COURS',
    stopCount: 3,
    deliveredCount: 0,
    needsConfirmation: false,
    completionPercent: 0,
    stopIds: ['A', 'B', 'C'],
    scheduledDate: TODAY,
    ...overrides,
  };
}

describe('where a run stands', () => {
  it('reads the six stages off the run', () => {
    expect(runStage(run({ status: 'A_CONFIRMER', needsConfirmation: true }))).toBe('toConfirm');
    expect(runStage(run({ needsConfirmation: true, newParcelsCount: 1 }))).toBe('modified');
    expect(runStage(run({ needsConfirmation: true, needsStart: true }))).toBe('toStart');
    expect(runStage(run(), 2)).toBe('inProgress');
    expect(runStage(run(), 0)).toBe('done');
    expect(runStage(run({ status: 'VALIDE' }), 0)).toBe('closed');
  });

  it('is "in progress" while the number of open parcels is unknown', () => {
    expect(runStage(run())).toBe('inProgress');
    // An empty run has nothing to finish.
    expect(runStage(run({ stopCount: 0, stopIds: [] }), 0)).toBe('inProgress');
  });

  it('says each stage in plain French', () => {
    const label = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], fr);
    expect(label(runStatusKey('toConfirm'))).toBe('En attente de votre confirmation');
    expect(label(runStatusKey('modified'))).toBe('En attente de votre confirmation');
    expect(label(runStatusKey('inProgress'))).toBe('En cours');
    expect(label(runStatusKey('done'))).toBe('Terminée');
    expect(label(runStatusKey('closed'))).toBe('Clôturée par l’agence');
    expect(fr.runsheets.day.today).toBe('Tournée du jour');
    expect(fr.runsheets.day.closedTitle).toBe('Tournée clôturée par l’agence');
  });
});

describe('the runs of the day', () => {
  it('knows which day a run is for', () => {
    expect(isRunForDay(run(), TODAY)).toBe(true);
    expect(isRunForDay(run({ scheduledDate: '2026-10-01' }), TODAY)).toBe(false);
    // No day of its own: the day it was closed.
    expect(isRunForDay(run({ scheduledDate: undefined, closedAt: '2026-10-02T20:47:31' }), TODAY)).toBe(true);
    expect(isRunForDay(run({ scheduledDate: undefined }), TODAY)).toBe(false);
  });

  it('lists the open runs, today’s first', () => {
    const old = run({ id: '60', scheduledDate: '2026-09-30' });
    const todays = run({ id: '72' });
    const older = run({ id: '50', scheduledDate: '2026-09-28' });
    expect(dayRuns([older, old, todays], [], TODAY).open.map((r) => r.id)).toEqual(['72', '60', '50']);
  });

  it('shows the run closed today — but not an older one', () => {
    const closedToday = run({ id: '72', status: 'VALIDE', closedAt: '2026-10-02T20:47:31' });
    const closedBefore = run({ id: '70', status: 'VALIDE', scheduledDate: '2026-09-30', closedAt: '2026-09-30T21:36:02' });
    const day = dayRuns([], [closedToday, closedBefore], TODAY);
    expect(day.open).toEqual([]);
    expect(day.closed.map((r) => r.id)).toEqual(['72']);
  });

  it('counts a run planned yesterday and closed today as closed today', () => {
    const late = run({ id: '71', status: 'VALIDE', scheduledDate: '2026-10-01', closedAt: '2026-10-02T08:05:00' });
    expect(dayRuns([], [late], TODAY).closed.map((r) => r.id)).toEqual(['71']);
  });

  it('never lists a closed run twice, and never as open', () => {
    const closed = run({ id: '72', status: 'VALIDE', closedAt: '2026-10-02T20:47:31' });
    const day = dayRuns([closed, run({ id: '73' })], [closed], TODAY);
    expect(day.open.map((r) => r.id)).toEqual(['73']);
    expect(day.closed.map((r) => r.id)).toEqual(['72']);
  });
});

describe('real server: the run the agency closed today', () => {
  const NOW = new Date(2026, 9, 2, 21, 0, 0);
  let urls: string[];

  const parcel = (tracking: string) => ({ id: 1, trackingNumber: tracking, status: 'LIVRE', recipientName: 'TEST', price: 10 });
  /** `GET /api/runsheets?driverId=` after "Valider la tournée", as the live server sent it. */
  const ALL = [
    {
      id: 72,
      code: 'RS-20261002-0001',
      status: 'COMPLETED',
      scheduledDate: '2026-10-02',
      completedAt: '2026-10-02T20:47:31',
      items: [{ id: 1, sequenceOrder: 1, status: 'DELIVERED', parcel: parcel('TUN-100-AAAA0001') }],
    },
    {
      id: 70,
      code: 'RS-20260930-0001',
      status: 'COMPLETED',
      scheduledDate: '2026-09-30',
      completedAt: '2026-09-30T21:36:02',
      items: [{ id: 2, sequenceOrder: 1, status: 'DELIVERED', parcel: parcel('TUN-100-AAAA0002') }],
    },
    { id: 74, code: 'RS-20261002-0003', status: 'CANCELLED', scheduledDate: '2026-10-02', items: [] },
  ];

  async function signedIn(active: unknown[], all: unknown): Promise<RealApi> {
    let api!: RealApi;
    jest.isolateModules(() => {
      api = require('../services/real-api');
    });
    const json = (status: number, body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      urls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/api/auth/login')) {
        return json(200, {
          token: 't', role: 'DRIVER', portal: '/driver',
          user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
        });
      }
      if (url.includes('/api/runsheets/driver/')) return json(200, active);
      if (url.includes('/api/runsheets?driverId=')) return all === null ? json(500, { error: 'down' }) : json(200, all);
      return json(404, { error: 'not found' });
    }) as unknown as typeof fetch;
    await api.login('driver', 'secret');
    urls.length = 0;
    return api;
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockKeychain.clear();
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
    urls = [];
  });

  it('is no longer in the active list, and is found as closed today', async () => {
    const api = await signedIn([], ALL);
    expect(await api.getRunsheets()).toEqual([]);

    const closed = await api.getClosedRunsheetsToday(NOW);
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      id: '72',
      code: 'RS-20261002-0001',
      status: 'VALIDE',
      serverStatus: 'COMPLETED',
      scheduledDate: '2026-10-02',
      closedAt: '2026-10-02T20:47:31',
      stopCount: 1,
    });
    expect(runStage(closed[0])).toBe('closed');
    // The Current tab: nothing open, one run closed today.
    expect(dayRuns([], closed, '2026-10-02')).toEqual({ open: [], closed });
  });

  it('only reads: one GET, the same request History uses', async () => {
    const api = await signedIn([], ALL);
    await api.getClosedRunsheetsToday(NOW);
    await api.getHistoryParcels();
    expect(urls.filter((url) => url.includes('/api/runsheets?driverId='))).toEqual([
      'GET https://jibex.cloud/api/runsheets?driverId=31',
    ]);
    expect(urls.every((url) => url.startsWith('GET '))).toBe(true);
  });

  it('shows no closed run the next day', async () => {
    const api = await signedIn([], ALL);
    expect(await api.getClosedRunsheetsToday(new Date(2026, 9, 3, 9, 0, 0))).toEqual([]);
  });

  it('gives nothing, not an error, when the history endpoint is down', async () => {
    const api = await signedIn([], null);
    expect(await api.getClosedRunsheetsToday(NOW)).toEqual([]);
  });

  it('tells an open run its day', async () => {
    const api = await signedIn(
      [{ id: 75, code: 'RS-20261002-0004', status: 'IN_PROGRESS', scheduledDate: '2026-10-02', items: [] }],
      ALL
    );
    expect((await api.getRunsheets())[0]).toMatchObject({ scheduledDate: '2026-10-02', closedAt: undefined });
  });
});
