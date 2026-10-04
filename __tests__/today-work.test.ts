/**
 * Round 5 of the live tests:
 *
 * 1. Home dropped to 0% and all zeros once the agency closed the run, though
 *    the driver had delivered two parcels that day. Home now counts TODAY's
 *    work, closed runs included.
 * 2. After "Remettre en attente" the server kept `failureReason: ABSENT` on
 *    an item that was PENDING again. A parcel that is not failed never shows
 *    a failure reason.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { formatPercent } from '../lib/currency';
import { shownFailureReason } from '../lib/failureReasons';
import { todayWork } from '../lib/todayWork';
import { toJob, toRunsheet } from '../services/real-api';
import type { Runsheet } from '../types';

const TODAY = '2026-10-03';

const item = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id,
  sequenceOrder: id,
  status,
  parcel: { id, trackingNumber: 'TUN-100-0000000' + id, status: 'EN_COURS', recipientName: 'TEST', price: 10 },
  ...extra,
});

/** RS-20261003-0001 as the live server had it at the end of round 5: closed, 2 delivered, 1 failed. */
const CLOSED = toRunsheet({
  id: 74,
  code: 'RS-20261003-0001',
  status: 'COMPLETED',
  scheduledDate: TODAY,
  completedAt: '2026-10-03T17:14:02',
  items: [
    item(1, 'DELIVERED'),
    item(2, 'DELIVERED'),
    item(3, 'FAILED', { failureReason: 'NOT_AVAILABLE_RESCHEDULED' }),
  ],
})!;

function open(items: ReturnType<typeof item>[], overrides: Record<string, unknown> = {}): Runsheet {
  return toRunsheet({
    id: 80,
    code: 'RS-20261003-0002',
    status: 'IN_PROGRESS',
    scheduledDate: TODAY,
    items,
    ...overrides,
  })!;
}

describe('Home counts today’s work', () => {
  it('keeps the numbers after the agency closed the run', () => {
    // The active list is empty once the run is closed: before, that meant all zeros.
    const work = todayWork([], [CLOSED], TODAY);
    expect(work).toMatchObject({ delivered: 2, failed: 1, remaining: 0, total: 3 });
    expect(formatPercent(work.ratePercent)).toBe('66.67%');
  });

  it('adds a run still open to a run closed the same day', () => {
    const going = open([item(4, 'DELIVERED'), item(5, 'PENDING'), item(6, 'PENDING')]);
    const work = todayWork([going], [CLOSED], TODAY);
    expect(work).toMatchObject({ delivered: 3, failed: 1, remaining: 2, total: 6 });
    // 3 delivered out of 4 attempted. The two still to do don't lower the rate.
    expect(formatPercent(work.ratePercent)).toBe('75.00%');
  });

  it('rate = delivered ÷ (delivered + failed), with two decimals', () => {
    const run = open([
      item(1, 'DELIVERED'),
      item(2, 'DELIVERED'),
      item(3, 'DELIVERED'),
      item(4, 'FAILED'),
      item(5, 'PENDING'),
    ]);
    expect(formatPercent(todayWork([run], [], TODAY).ratePercent)).toBe('75.00%');
    const perfect = open([item(1, 'DELIVERED')]);
    expect(formatPercent(todayWork([perfect], [], TODAY).ratePercent)).toBe('100.00%');
  });

  it('is 0.00% with nothing attempted yet — and never divides by zero', () => {
    expect(formatPercent(todayWork([], [], TODAY).ratePercent)).toBe('0.00%');
    const fresh = open([item(1, 'PENDING'), item(2, 'PENDING')]);
    expect(todayWork([fresh], [], TODAY)).toMatchObject({
      delivered: 0,
      failed: 0,
      remaining: 2,
      total: 2,
      ratePercent: 0,
    });
  });

  it('leaves out a run closed on another day', () => {
    const yesterday = toRunsheet({
      id: 73,
      code: 'RS-20261002-0002',
      status: 'COMPLETED',
      scheduledDate: '2026-10-02',
      completedAt: '2026-10-02T20:55:06',
      items: [item(1, 'FAILED', { failureReason: 'ABSENT' })],
    })!;
    expect(todayWork([], [yesterday], TODAY)).toMatchObject({ delivered: 0, failed: 0, total: 0 });
  });

  it('never counts the same run twice', () => {
    expect(todayWork([CLOSED], [CLOSED], TODAY)).toMatchObject({ delivered: 2, failed: 1, total: 3 });
  });

  it('counts a parcel waiting for the driver’s confirmation as still to do', () => {
    const changed = open([item(1, 'DELIVERED'), item(2, 'PENDING_DRIVER_CONFIRMATION')]);
    expect(todayWork([changed], [], TODAY)).toMatchObject({ delivered: 1, failed: 0, remaining: 1 });
  });
});

describe('a failure reason only on a failed parcel', () => {
  const parcel = {
    id: 135,
    trackingNumber: 'TUN-100-6D42D0BF',
    status: 'EN_COURS',
    recipientName: 'TEST AMYYN',
    price: 10,
  };

  it('ignores the reason the server keeps after "Remettre en attente"', () => {
    // P10 in round 5: PENDING again, but still carrying ABSENT.
    const job = toJob(parcel, { id: 145, status: 'PENDING', failureReason: 'ABSENT', notes: null, parcel });
    expect(job.status).toBe('PENDING');
    expect(job.failureReason).toBeUndefined();
    expect(job.failureNote).toBeUndefined();
    expect(shownFailureReason(job)).toBeUndefined();
  });

  it('ignores a stale reason and note on a delivered parcel', () => {
    const job = toJob(parcel, {
      id: 145,
      status: 'DELIVERED',
      failureReason: 'ABSENT',
      notes: 'Client non appelé.',
      parcel,
    });
    expect(job.status).toBe('DELIVERED');
    expect(job.failureReason).toBeUndefined();
    expect(job.failureNote).toBeUndefined();
    expect(job.server?.unknownFailureReason).toBeUndefined();
  });

  it('still shows it on a failed parcel', () => {
    const job = toJob(parcel, {
      id: 145,
      status: 'FAILED',
      failureReason: 'ABSENT',
      notes: 'Client non appelé.',
      parcel,
    });
    expect(job.failureReason).toBe('ABSENT');
    expect(job.failureNote).toBe('Client non appelé.');
    expect(shownFailureReason(job)).toBe('ABSENT');
  });

  it('the screen-side guard holds even if the data carries one', () => {
    expect(shownFailureReason({ status: 'PENDING', failureReason: 'ABSENT' })).toBeUndefined();
    expect(shownFailureReason({ status: 'DELIVERED', failureReason: 'ABSENT' })).toBeUndefined();
    expect(shownFailureReason({ status: 'FAILED', failureReason: 'ABSENT' })).toBe('ABSENT');
  });
});
