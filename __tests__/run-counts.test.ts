/**
 * The run in numbers: Livrés / Échoués / Restants, like the Android run
 * header, and the run being delivered named on Home.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import fr from '../lib/i18n/fr';
import { i18next } from '../lib/i18n';
import { runCounts, runsInProgress } from '../lib/runsheetDay';
import { toRunsheet } from '../services/real-api';
import type { Runsheet } from '../types';

const TODAY = '2026-10-02';
const run = (overrides: Partial<Runsheet>): Runsheet => ({
  id: '1',
  zone: '',
  agency: '',
  status: 'EN_COURS',
  stopCount: 0,
  deliveredCount: 0,
  needsConfirmation: false,
  completionPercent: 0,
  stopIds: [],
  scheduledDate: TODAY,
  ...overrides,
});

describe('Livrés / Échoués / Restants', () => {
  it('counts what is done and what is left', () => {
    expect(runCounts(run({ stopCount: 12, deliveredCount: 7, failedCount: 2 }))).toEqual({ delivered: 7, failed: 2, remaining: 3 });
  });

  it('treats a missing failed count as zero, and never goes below zero', () => {
    expect(runCounts(run({ stopCount: 4, deliveredCount: 1 }))).toEqual({ delivered: 1, failed: 0, remaining: 3 });
    expect(runCounts(run({ stopCount: 2, deliveredCount: 2, failedCount: 1 })).remaining).toBe(0);
  });

  it('real server: the failed count comes from the run’s own lines', () => {
    const item = (id: number, status: string) => ({
      id,
      sequenceOrder: id,
      status,
      parcel: { id, trackingNumber: 'TUN-100-0000000' + id, status: 'EN_COURS', recipientName: 'TEST' },
    });
    const runsheet = toRunsheet({
      id: 60,
      code: 'RS-20261002-0001',
      status: 'IN_PROGRESS',
      items: [item(1, 'DELIVERED'), item(2, 'FAILED'), item(3, 'FAILED'), item(4, 'PENDING')],
    })!;
    expect(runCounts(runsheet)).toEqual({ delivered: 1, failed: 2, remaining: 1 });
  });

  it('says it in French', () => {
    expect(fr.runsheets.day.counts).toEqual({ delivered: 'Livrés', failed: 'Échoués', remaining: 'Restants' });
  });
});

describe('the run named on Home', () => {
  it('is a run being delivered — not one to confirm, to start, or closed', () => {
    const runs = [
      run({ id: 'new', status: 'A_CONFIRMER', needsConfirmation: true }),
      run({ id: 'toStart', needsConfirmation: true, needsStart: true }),
      run({ id: 'going' }),
      run({ id: 'changed', needsConfirmation: true, newStopIds: ['X'] }),
      run({ id: 'closed', status: 'VALIDE' }),
    ];
    expect(runsInProgress(runs, TODAY).map((r) => r.id)).toEqual(['going', 'changed']);
  });

  it('puts today’s run first', () => {
    const runs = [run({ id: 'old', scheduledDate: '2026-09-30' }), run({ id: 'today' })];
    expect(runsInProgress(runs, TODAY).map((r) => r.id)).toEqual(['today', 'old']);
  });

  it('reads "Tournée en cours · 3 restants sur 12"', () => {
    expect(i18next.getFixedT('fr')('home.currentRun', { remaining: 3, total: 12 })).toBe('Tournée en cours · 3 restants sur 12');
  });
});
