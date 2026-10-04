/**
 * History rows of one parcel must be told apart.
 *
 * On the iPhone, TUN-100-78CF079C showed three identical cards: three failed
 * attempts on three runs. Each card now carries its run code, its day and
 * which attempt it was: "RS-20261002-0002 · 02/10 · Tentative 4".
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import { historyAttempts, historyRecordLine, shortDay } from '../lib/historyRecord';
import { i18next } from '../lib/i18n';
import { runsheetJobs } from '../services/real-api';
import type { Job } from '../types';

const t = i18next.getFixedT('fr');
const label = (number: number) => t('attempts.plain', { number });

function row(overrides: Partial<Job> & { runsheetId?: string; parcelId?: string }): Job {
  const { runsheetId, parcelId = '126', ...job } = overrides;
  return {
    id: 'TUN-100-78CF079C',
    status: 'FAILED',
    customerName: 'TEST AMYYN',
    ...job,
    server: { parcelId, runsheetId },
  } as Job;
}

describe('which attempt a History row was', () => {
  it('numbers the rows of one parcel from the oldest run to the newest', () => {
    // History lists the newest run first.
    const rows = [
      row({ runsheetId: '73', run: { code: 'RS-20261002-0002', date: '2026-10-02' }, deliveryAttempts: 3 }),
      row({ runsheetId: '72', run: { code: 'RS-20261002-0001', date: '2026-10-02' }, deliveryAttempts: 3 }),
      row({ runsheetId: '71', run: { code: 'RS-20260930-0002', date: '2026-09-30' }, deliveryAttempts: 3 }),
    ];
    expect(historyAttempts(rows)).toEqual([3, 2, 1]);
  });

  it('starts higher when the server counted attempts this driver does not have', () => {
    // Four failures counted, only two on this driver's runs: his were the 3rd and 4th.
    const rows = [
      row({ runsheetId: '73', run: { date: '2026-10-02' }, deliveryAttempts: 4 }),
      row({ runsheetId: '72', run: { date: '2026-10-01' }, deliveryAttempts: 4 }),
    ];
    expect(historyAttempts(rows)).toEqual([4, 3]);
  });

  it('gives a delivery after two failures the number 3', () => {
    const rows = [
      row({ runsheetId: '80', status: 'DELIVERED', run: { date: '2026-10-03' }, deliveryAttempts: 2 }),
      row({ runsheetId: '79', run: { date: '2026-10-02' }, deliveryAttempts: 2 }),
      row({ runsheetId: '78', run: { date: '2026-10-01' }, deliveryAttempts: 2 }),
    ];
    expect(historyAttempts(rows)).toEqual([3, 2, 1]);
  });

  it('keeps parcels apart, and a parcel seen once is attempt 1', () => {
    const rows = [
      row({ id: 'A', parcelId: '1', status: 'DELIVERED' }),
      row({ id: 'B', parcelId: '2', runsheetId: '9', run: { date: '2026-10-02' } }),
      row({ id: 'B', parcelId: '2', runsheetId: '8', run: { date: '2026-10-01' } }),
    ];
    expect(historyAttempts(rows)).toEqual([1, 2, 1]);
  });

  it('falls back to the list order (newest first) when runs have no day', () => {
    const rows = [row({}), row({}), row({})];
    expect(historyAttempts(rows)).toEqual([3, 2, 1]);
  });

  it('handles an empty history', () => {
    expect(historyAttempts([])).toEqual([]);
  });
});

describe('the line on a History card', () => {
  it('reads "RS-20261002-0002 · 02/10 · Tentative 4"', () => {
    const job = row({ run: { code: 'RS-20261002-0002', date: '2026-10-02' } });
    expect(historyRecordLine(job, label(4))).toBe('RS-20261002-0002 · 02/10 · Tentative 4');
  });

  it('leaves out what the row does not have', () => {
    expect(historyRecordLine(row({}), label(1))).toBe('Tentative 1');
    expect(historyRecordLine(row({ run: { code: 'RS-1' } }), label(2))).toBe('RS-1 · Tentative 2');
    expect(shortDay('2026-09-30T08:00:00')).toBe('30/09');
    expect(shortDay(undefined)).toBeUndefined();
    expect(shortDay('demain')).toBeUndefined();
  });

  it('makes the three cards of the live test different', () => {
    const rows = [
      row({ runsheetId: '73', run: { code: 'RS-20261002-0002', date: '2026-10-02' }, deliveryAttempts: 3 }),
      row({ runsheetId: '72', run: { code: 'RS-20261002-0001', date: '2026-10-02' }, deliveryAttempts: 3 }),
      row({ runsheetId: '71', run: { code: 'RS-20260930-0002', date: '2026-09-30' }, deliveryAttempts: 3 }),
    ];
    const attempts = historyAttempts(rows);
    const lines = rows.map((job, index) => historyRecordLine(job, label(attempts[index])));
    expect(lines).toEqual([
      'RS-20261002-0002 · 02/10 · Tentative 3',
      'RS-20261002-0001 · 02/10 · Tentative 2',
      'RS-20260930-0002 · 30/09 · Tentative 1',
    ]);
    expect(new Set(lines).size).toBe(3);
  });
});

describe('where the run code and day come from', () => {
  it('real server: every parcel of a run carries the run’s code and day', () => {
    const jobs = runsheetJobs({
      id: 73,
      code: 'RS-20261002-0002',
      status: 'COMPLETED',
      scheduledDate: '2026-10-02',
      items: [
        {
          id: 1,
          sequenceOrder: 1,
          status: 'FAILED',
          parcel: { id: 126, trackingNumber: 'TUN-100-78CF079C', status: 'A_VERIFIER' },
        },
      ],
    });
    expect(jobs[0].run).toEqual({ code: 'RS-20261002-0002', date: '2026-10-02' });
    expect(jobs[0].server).toMatchObject({ runsheetId: '73', parcelId: '126' });
  });

  it('mock data: History rows carry their run too, and stay without a phone action', async () => {
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
    let api!: typeof import('../services/mock-api');
    jest.isolateModules(() => {
      api = require('../services/mock-api');
    });
    const history = await api.getHistoryParcels();
    expect(history.length).toBeGreaterThan(0);
    for (const job of history) {
      expect(job.run?.code).toMatch(/^RS-\d{8}-\d{4}$/);
      expect(job.run?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
