/**
 * History rows when one parcel is on several runs.
 *
 * In the live test, parcel P2 failed on four runsheets and so appeared in
 * History four times. Rows were keyed by tracking number, React reported
 * "two children with the same key" and could drop or repeat rows.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { parcelRowKey, parcelRowKeys } from '../lib/rowKey';
import { runsheetJobs } from '../services/real-api';
import type { Job } from '../types';

const parcel = (id: number, tracking: string) => ({
  id,
  trackingNumber: tracking,
  status: 'RTN_DEPOT',
  recipientName: 'Client Test',
});

/** The same parcel (id 127) failed on four runs, like P2 in the live test. */
const RUNS = [70, 71, 72, 73].map((runsheetId, i) => ({
  id: runsheetId,
  code: `RS-TEST-000${i + 1}`,
  status: 'COMPLETED',
  items: [
    {
      id: 136 + i,
      sequenceOrder: 1,
      status: 'FAILED',
      failureReason: 'ABSENT',
      parcel: parcel(127, 'TUN-100-78CF079C'),
    },
    { id: 236 + i, sequenceOrder: 2, status: 'DELIVERED', parcel: parcel(500 + i, `TUN-100-0000000${i}`) },
  ],
}));

describe('history row keys', () => {
  const history: Job[] = RUNS.flatMap((run) => runsheetJobs(run));

  it('names a row by its runsheet and its parcel', () => {
    expect(parcelRowKey(history[0])).toBe('70-127');
    expect(parcelRowKey(history[2])).toBe('71-127');
  });

  it('gives every row its own key when one parcel is on four runs', () => {
    const keys = parcelRowKeys(history);
    expect(history.filter((job) => job.id === 'TUN-100-78CF079C')).toHaveLength(4);
    expect(new Set(keys).size).toBe(history.length);
  });

  it('keeps every row: none is dropped', () => {
    expect(parcelRowKeys(history)).toHaveLength(8);
  });

  it('stays unique even if the server repeats a parcel on the same run', () => {
    const twice = [...runsheetJobs(RUNS[0]), ...runsheetJobs(RUNS[0])];
    const keys = parcelRowKeys(twice);
    expect(new Set(keys).size).toBe(twice.length);
    expect(keys).toEqual(['70-127', '70-500', '70-127#2', '70-500#2']);
  });

  it('falls back to the tracking number on mock parcels, which have no server ids', () => {
    const mock = { id: 'TRK-5DF3697E' } as Job;
    expect(parcelRowKey(mock)).toBe('TRK-5DF3697E');
  });
});
