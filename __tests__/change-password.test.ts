/**
 * "Changer le mot de passe" — the Android app has it, ours did not.
 * Same endpoint (`PUT api/driver-auth/change-password`), same body
 * (`{driverId, oldPassword, newPassword}`) and same checks (the two new
 * entries match, at least 4 characters).
 */
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

import fr from '../lib/i18n/fr';
import { passwordProblem } from '../lib/password';

type RealApi = typeof import('../services/real-api');
type MockApi = typeof import('../services/mock-api');

beforeEach(() => {
  mockKeychain.clear();
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('the checks before sending', () => {
  const ok = { oldPassword: 'ancien1', newPassword: 'nouveau1', confirmPassword: 'nouveau1' };

  it('accepts a matching new password of 4 characters or more', () => {
    expect(passwordProblem(ok)).toBeNull();
    expect(passwordProblem({ ...ok, newPassword: 'abcd', confirmPassword: 'abcd' })).toBeNull();
  });

  it('refuses two new entries that differ', () => {
    expect(passwordProblem({ ...ok, confirmPassword: 'nouveau2' })).toBe('changePassword.errors.mismatch');
    expect(fr.changePassword.errors.mismatch).toBe('Les mots de passe ne correspondent pas');
  });

  it('refuses a new password under 4 characters', () => {
    expect(passwordProblem({ ...ok, newPassword: 'abc', confirmPassword: 'abc' })).toBe('changePassword.errors.tooShort');
    expect(fr.changePassword.errors.tooShort).toBe('Mot de passe trop court (min. 4 caractères)');
  });

  it('asks for the current password, and for a different new one', () => {
    expect(passwordProblem({ ...ok, oldPassword: '' })).toBe('changePassword.errors.oldRequired');
    expect(passwordProblem({ oldPassword: 'same1', newPassword: 'same1', confirmPassword: 'same1' })).toBe(
      'changePassword.errors.same'
    );
  });

  it('is called "Changer le mot de passe"', () => {
    expect(fr.changePassword.title).toBe('Changer le mot de passe');
  });
});

describe('mock account', () => {
  function freshMock(): MockApi {
    let api!: MockApi;
    jest.isolateModules(() => {
      api = require('../services/mock-api');
    });
    return api;
  }

  it('refuses a wrong current password and changes nothing', async () => {
    const api = freshMock();
    expect(await api.changePassword('wrong', 'nouveau1', 'nouveau1')).toEqual({
      success: false,
      error: 'changePassword.errors.wrongOld',
    });
    expect((await api.login('driver', 'nouveau1')).success).toBe(false);
  });

  it('changes the password: the old one stops working, the new one signs in', async () => {
    const api = freshMock();
    const user = await api.getUser();
    expect((await api.login(user.username, 'password123')).success).toBe(true);
    expect(await api.changePassword('password123', 'nouveau1', 'nouveau1')).toEqual({ success: true });
    expect((await api.login(user.username, 'password123')).success).toBe(false);
    expect((await api.login(user.username, 'nouveau1')).success).toBe(true);
  });
});

describe('real server', () => {
  let calls: { method: string; url: string; body?: unknown }[];

  function load(writes: 'on' | 'off', answer: () => Promise<Response>): RealApi {
    process.env.EXPO_PUBLIC_API_WRITES = writes;
    let api!: RealApi;
    jest.isolateModules(() => {
      api = require('../services/real-api');
    });
    const json = (status: number, body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith('/api/auth/login')) {
        return json(200, {
          token: 't', role: 'DRIVER', portal: '/driver',
          user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
        });
      }
      if (url.includes('/api/driver-auth/change-password')) return answer();
      return json(404, { error: 'not found' });
    }) as unknown as typeof fetch;
    return api;
  }

  const ok = () => Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_WRITES;
  });

  it('with writes OFF: sends nothing and says so', async () => {
    const api = load('off', ok);
    await api.login('driver', 'secret');
    calls.length = 0;
    expect(await api.changePassword('ancien1', 'nouveau1', 'nouveau1')).toEqual({ success: false, error: 'common.writesOff' });
    expect(calls).toEqual([]);
  });

  it('never sends a password that fails the checks, even with writes on', async () => {
    const api = load('on', ok);
    await api.login('driver', 'secret');
    calls.length = 0;
    expect((await api.changePassword('ancien1', 'abc', 'abc')).error).toBe('changePassword.errors.tooShort');
    expect((await api.changePassword('ancien1', 'nouveau1', 'nouveau2')).error).toBe('changePassword.errors.mismatch');
    expect(calls).toEqual([]);
  });

  it('with writes on: the same call and body as Android, with the DRIVER id', async () => {
    const api = load('on', ok);
    await api.login('driver', 'secret');
    calls.length = 0;
    expect(await api.changePassword('ancien1', 'nouveau1', 'nouveau1')).toEqual({ success: true });
    expect(calls).toEqual([
      {
        method: 'PUT',
        url: 'https://jibex.cloud/api/driver-auth/change-password',
        body: { driverId: 31, oldPassword: 'ancien1', newPassword: 'nouveau1' },
      },
    ]);
  });

  it('a wrong current password does not sign the driver out', async () => {
    const api = load('on', () => Promise.resolve(new Response('', { status: 401 })));
    await api.login('driver', 'secret');
    expect(mockKeychain.size).toBeGreaterThan(0);
    expect(await api.changePassword('wrong', 'nouveau1', 'nouveau1')).toEqual({
      success: false,
      error: 'changePassword.errors.wrongOld',
    });
    // Still signed in: the session is still in the keychain.
    expect(mockKeychain.size).toBeGreaterThan(0);
  });

  it('shows the server’s own reason when it gives one', async () => {
    const api = load('on', () =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Ancien mot de passe incorrect' }), { status: 400 }))
    );
    await api.login('driver', 'secret');
    expect(await api.changePassword('wrong', 'nouveau1', 'nouveau1')).toEqual({
      success: false,
      error: 'common.serverRefused',
      errorParams: { reason: 'Ancien mot de passe incorrect' },
    });
  });
});
