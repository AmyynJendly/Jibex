/**
 * "Tentative N/3": which attempt a parcel is on, from the server's count of
 * failed attempts. In the live test a parcel went out a third and a fourth
 * time and the app showed nothing different from a first attempt.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { attemptInfo } from '../lib/attempts';
import { i18next } from '../lib/i18n';
import { toJob } from '../services/real-api';

describe('attempt number', () => {
  it('is 1 for a parcel that has never failed', () => {
    expect(attemptInfo(0)).toEqual({ number: 1, max: 3, last: false, over: false });
    expect(attemptInfo(undefined).number).toBe(1);
    expect(attemptInfo(null).number).toBe(1);
  });

  it('is one more than the failed attempts the server counted', () => {
    expect(attemptInfo(1)).toMatchObject({ number: 2, last: false });
    expect(attemptInfo(2)).toMatchObject({ number: 3, last: true, over: false });
  });

  it('flags the last allowed attempt from the third on', () => {
    expect(attemptInfo(2).last).toBe(true);
    // The live server accepted a fourth run: still "last", and past the limit.
    expect(attemptInfo(3)).toMatchObject({ number: 4, last: true, over: true });
  });

  it('ignores a nonsense count rather than showing it', () => {
    expect(attemptInfo(-2).number).toBe(1);
    expect(attemptInfo(Number.NaN).number).toBe(1);
  });

  it('comes from the parcel’s deliveryAttempts on the real server', () => {
    const job = toJob({ id: 127, trackingNumber: 'TUN-100-78CF079C', status: 'EN_COURS', deliveryAttempts: 2 });
    expect(job.deliveryAttempts).toBe(2);
    expect(attemptInfo(job.deliveryAttempts)).toMatchObject({ number: 3, last: true });
    // A parcel the server sends no count for is a first attempt.
    expect(toJob({ id: 1, trackingNumber: 'X' }).deliveryAttempts).toBeUndefined();
  });

  it('reads "Tentative N/3" and "Dernière tentative" in French', () => {
    const t = i18next.getFixedT('fr');
    expect(t('attempts.label', { number: 2, max: 3 })).toBe('Tentative 2/3');
    expect(t('attempts.last')).toBe('Dernière tentative');
    expect(t('attempts.over', { number: 4, max: 3 })).toBe('Tentative 4 — au-delà des 3 autorisées');
  });
});
