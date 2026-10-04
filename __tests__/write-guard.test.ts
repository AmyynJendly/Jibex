/**
 * Weak network and double taps.
 *
 *  - A second tap can never send the same write twice: the lock is taken
 *    before anything is awaited, not on the next render.
 *  - A request the server did not answer in time reads "Connexion lente",
 *    not "Connexion impossible": the server may have received it, so the
 *    screen reloads and offers "Réessayer".
 *  - Nothing is reported as done unless the server said so.
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import { errorKeyOf, isNetworkError, isTimeoutError } from '../lib/errors';
import fr from '../lib/i18n/fr';
import { createWriteGuard, isRetryable, mayHaveReachedServer } from '../lib/writeGuard';
import { safely } from '../lib/writeResult';

type RealApi = typeof import('../services/real-api');

describe('double taps', () => {
  it('refuses a second tap while the first write is running — and sends it once', async () => {
    const guard = createWriteGuard();
    let sent = 0;
    let finish!: () => void;
    const write = () =>
      guard.run(async () => {
        sent += 1;
        await new Promise<void>((resolve) => (finish = resolve));
        return { success: true };
      });

    // Two taps in the same instant: no render happens between them.
    const first = write();
    const second = write();
    expect(await second).toBeNull();
    expect(sent).toBe(1);
    expect(guard.running).toBe(true);

    finish();
    expect(await first).toEqual({ success: true });
    expect(guard.running).toBe(false);
  });

  it('takes the lock at once with begin(), and gives it back with end()', () => {
    const guard = createWriteGuard();
    expect(guard.begin()).toBe(true);
    expect(guard.begin()).toBe(false);
    expect(guard.begin()).toBe(false);
    guard.end();
    expect(guard.begin()).toBe(true);
  });

  it('gives the lock back when the write fails or throws', async () => {
    const guard = createWriteGuard();
    await expect(
      guard.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(guard.running).toBe(false);
    expect(await guard.run(async () => 'again')).toBe('again');
  });

  it('tells the button when it is sending, once per change', async () => {
    const seen: boolean[] = [];
    const guard = createWriteGuard((running) => seen.push(running));
    await guard.run(async () => undefined);
    guard.end();
    expect(seen).toEqual([true, false]);
  });
});

describe('a failure that deserves "Réessayer"', () => {
  it('is one where the request got no answer', () => {
    expect(isRetryable({ error: 'common.networkError' })).toBe(true);
    expect(isRetryable({ error: 'common.slowConnection' })).toBe(true);
    // The server answered "no": trying the same thing again won't help.
    expect(isRetryable({ error: 'common.serverRefused' })).toBe(false);
    expect(isRetryable({ error: 'statusUpdate.callRequired' })).toBe(false);
  });

  it('reloads the screen only after a timeout: the server may have received it', () => {
    expect(mayHaveReachedServer({ error: 'common.slowConnection' })).toBe(true);
    expect(mayHaveReachedServer({ error: 'common.networkError' })).toBe(false);
  });

  it('says it in French', () => {
    expect(fr.common.slowConnection).toBe('Connexion lente — réessayez.');
    expect(fr.common.sending).toBe('Envoi…');
    expect(fr.common.loadError.retry).toBe('Réessayer');
  });
});

describe('real server: a slow answer is not "no connection"', () => {
  let calls: string[];

  function load(writes: 'on' | 'off'): RealApi {
    process.env.EXPO_PUBLIC_API_WRITES = writes;
    let api!: RealApi;
    jest.isolateModules(() => {
      api = require('../services/real-api');
    });
    return api;
  }
  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  const LOGIN = {
    token: 't', role: 'DRIVER', portal: '/driver',
    user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
  };
  /** A server that never answers: the request only ends when the app gives up on it. */
  const hang = (init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });

  beforeEach(() => {
    calls = [];
    mockKeychain.clear();
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  });
  afterEach(() => {
    jest.useRealTimers();
    delete process.env.EXPO_PUBLIC_API_WRITES;
  });

  it('a request with no answer after 20 s fails as a timeout', async () => {
    const api = load('off');
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      calls.push(url);
      return url.endsWith('/api/auth/login') ? json(200, LOGIN) : hang(init);
    }) as unknown as typeof fetch;
    await api.login('driver', 'secret');

    jest.useFakeTimers();
    const pending = api.getRunsheets().catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(20_500);
    const error = await pending;
    expect(isTimeoutError(error)).toBe(true);
    expect(isNetworkError(error)).toBe(true);
    expect(errorKeyOf(error)).toBe('common.slowConnection');
  });

  it('a request that never left the phone stays "no connection"', async () => {
    const api = load('off');
    globalThis.fetch = jest.fn((url: string) =>
      url.endsWith('/api/auth/login') ? json(200, LOGIN) : Promise.reject(new TypeError('Network request failed'))
    ) as unknown as typeof fetch;
    await api.login('driver', 'secret');
    const error = await api.getRunsheets().catch((e: unknown) => e);
    expect(isTimeoutError(error)).toBe(false);
    expect(errorKeyOf(error)).toBe('common.networkError');
  });

  it('a write that times out is reported as slow — never as done', async () => {
    const api = load('on');
    const item = { id: 1, sequenceOrder: 1, status: 'PENDING', parcel: { id: 1, trackingNumber: 'TUN-100-00000001', status: 'EN_COURS', recipientName: 'TEST', price: 10 } };
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      calls.push((init?.method ?? 'GET') + ' ' + url);
      if (url.endsWith('/api/auth/login')) return json(200, LOGIN);
      if (url.includes('/api/runsheets/driver/')) return json(200, [{ id: 60, code: 'RS-1', status: 'IN_PROGRESS', items: [item] }]);
      if (init?.method === 'PUT') return hang(init);
      return json(404, {});
    }) as unknown as typeof fetch;
    await api.login('driver', 'secret');
    await api.logCallAttempt('TUN-100-00000001');

    jest.useFakeTimers();
    const pending = safely(() => api.confirmDelivery('TUN-100-00000001', 10));
    await jest.advanceTimersByTimeAsync(20_500);
    const result = await pending;
    expect(result).toMatchObject({ success: false, error: 'common.slowConnection' });
    expect(isRetryable(result)).toBe(true);
    expect(mayHaveReachedServer(result)).toBe(true);
    // Sent once. The app did not try again by itself.
    expect(calls.filter((call) => call.startsWith('PUT '))).toHaveLength(1);
  });
});
