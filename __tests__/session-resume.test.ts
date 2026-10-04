/**
 * Session expiry (the token lasts 24 hours and can't be renewed).
 *
 * A 401 opens login on top of the current screen, and the same driver comes
 * back to the same screen with what he had typed. Another driver lands on
 * Home.
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import { afterLogin } from '../lib/resume';

type Session = typeof import('../lib/session');
type RealApi = typeof import('../services/real-api');

describe('where the driver goes after signing in', () => {
  const expired = { resumed: true, canGoBack: true, expiredDriverId: '31', driverId: '31' };

  it('the same driver, after an expiry: back to the screen he was on', () => {
    expect(afterLogin(expired)).toBe('back');
  });

  it('a normal sign-in: Home', () => {
    expect(afterLogin({ resumed: false, canGoBack: false, expiredDriverId: null, driverId: '31' })).toBe('home');
    // Even with a stale "who expired" left over from earlier.
    expect(afterLogin({ ...expired, resumed: false })).toBe('home');
  });

  it('another driver signs in over an expired session: Home, never the other driver’s screen', () => {
    expect(afterLogin({ ...expired, driverId: '44' })).toBe('home');
  });

  it('nothing to go back to, or nobody known: Home', () => {
    expect(afterLogin({ ...expired, canGoBack: false })).toBe('home');
    expect(afterLogin({ ...expired, expiredDriverId: null })).toBe('home');
    expect(afterLogin({ ...expired, driverId: null })).toBe('home');
  });
});

describe('the expiry event', () => {
  let session: Session;
  let api: RealApi;
  let status: number;

  const json = (code: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json' } }));

  beforeEach(async () => {
    mockKeychain.clear();
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
    status = 200;
    jest.isolateModules(() => {
      session = require('../lib/session');
      api = require('../services/real-api');
    });
    globalThis.fetch = jest.fn((url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return json(200, {
          token: 't', role: 'DRIVER', portal: '/driver',
          user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
        });
      }
      return status === 200 ? json(200, []) : json(status, { error: 'expired' });
    }) as unknown as typeof fetch;
    await api.login('driver', 'secret');
  });

  it('a 401 asks the driver to sign in again — once, however many requests fail', async () => {
    let asked = 0;
    session.onSessionExpired(() => {
      asked += 1;
    });
    status = 401;
    // The screen under the login screen keeps asking for its data.
    await Promise.allSettled([api.getRunsheets(), api.getPickups(), api.getTransfers()]);
    await Promise.allSettled([api.getRunsheets(), api.getNotifications()]);
    expect(asked).toBe(1);
    expect(session.lastExpiredDriverId()).toBe('31');
    expect(await session.hasActiveSession()).toBe(false);
  });

  it('remembers who expired, so the same driver can come back to his screen', async () => {
    status = 401;
    await api.getRunsheets().catch(() => {});
    status = 200;
    await api.login('driver', 'secret');
    const now = await session.getSession();
    expect(afterLogin({ resumed: true, canGoBack: true, expiredDriverId: session.lastExpiredDriverId(), driverId: now?.driverId ?? null })).toBe('back');
  });

  it('after signing in again, a later expiry asks again', async () => {
    let asked = 0;
    session.onSessionExpired(() => {
      asked += 1;
    });
    status = 401;
    await api.getRunsheets().catch(() => {});
    status = 200;
    await api.login('driver', 'secret');
    await new Promise((resolve) => setTimeout(resolve, 3_100)); // past the shared-fetch window
    status = 401;
    await api.getRunsheets().catch(() => {});
    expect(asked).toBe(2);
  });

  it('a wrong password on the login call is not an expiry', async () => {
    let asked = 0;
    session.onSessionExpired(() => {
      asked += 1;
    });
    globalThis.fetch = jest.fn(() => json(401, { error: 'bad credentials' })) as unknown as typeof fetch;
    const result = await api.login('driver', 'wrong');
    expect(result.success).toBe(false);
    expect(asked).toBe(0);
  });
});
