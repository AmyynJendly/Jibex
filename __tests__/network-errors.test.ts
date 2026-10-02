/**
 * "Connexion impossible — réessayer": a request that never reached the
 * server must end as a message with a way to retry, never as an uncaught
 * error. In the live test the app logged "Uncaught (in promise) ApiError:
 * network".
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { errorKeyOf, isNetworkError } from '../lib/errors';
import en from '../lib/i18n/en';
import fr from '../lib/i18n/fr';
import { safely } from '../lib/writeResult';
import { ApiError } from '../services/real-api';

describe('network errors', () => {
  it('recognises a request that never got an answer', () => {
    expect(isNetworkError(new ApiError(0, 'network'))).toBe(true);
  });

  it('doesn’t mistake a server refusal, or anything else, for a lost connection', () => {
    expect(isNetworkError(new ApiError(500, 'server'))).toBe(false);
    expect(isNetworkError(new ApiError(401, 'not signed in'))).toBe(false);
    expect(isNetworkError(new Error('network'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError('network')).toBe(false);
  });

  it('turns a thrown network error into a "no connection" result, not a crash', async () => {
    const result = await safely(async () => {
      throw new ApiError(0, 'network');
    });
    expect(result).toEqual({ success: false, error: 'common.networkError' });
  });

  it('keeps the general message for other failures', async () => {
    const result = await safely(async () => {
      throw new Error('boom');
    });
    expect(result).toEqual({ success: false, error: 'common.genericError' });
    expect(errorKeyOf(new ApiError(503, 'down'))).toBe('common.genericError');
  });

  it('passes a normal answer through untouched', async () => {
    expect(await safely(async () => ({ success: true }))).toEqual({ success: true });
    expect(await safely(async () => ({ success: false, error: 'common.writesOff' }))).toEqual({
      success: false,
      error: 'common.writesOff',
    });
  });

  it('says "Connexion impossible" with a retry, in both languages', () => {
    expect(fr.common.networkError).toBe('Connexion impossible — réessayez.');
    expect(fr.common.loadError.title).toBe('Connexion impossible');
    expect(fr.common.loadError.retry).toBe('Réessayer');
    expect(en.common.loadError.retry).toBeTruthy();
  });
});
