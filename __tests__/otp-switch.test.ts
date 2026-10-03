/**
 * The OTP switch, EXPO_PUBLIC_OTP = off | mock | real.
 *
 * Defaults: mock on mock data, OFF on the real server — a real delivery must
 * never be blocked because the OTP API does not exist yet.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { otpModeFor } from '../constants/backend';
import { i18next } from '../lib/i18n';
import { cardCash, otpItemId } from '../lib/otpRule';

type OtpModule = typeof import('../services/otp');
type MockApi = typeof import('../services/mock-api');
type RealApi = typeof import('../services/real-api');

const FEE_ONLY = { cashToCollect: 10, deliveryFee: 10 };
const NOTHING = { cashToCollect: 0, deliveryFee: 0 };
const NORMAL = { cashToCollect: 950, deliveryFee: 10 };

/** Loads modules fresh under the given environment, then puts the environment back. */
function withEnv<T>(env: Record<string, string | undefined>, load: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    let result!: T;
    jest.isolateModules(() => {
      result = load();
    });
    return result;
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('which mode is in force', () => {
  it('with nothing set: mock on mock data, off on the real server', () => {
    expect(otpModeFor('mock', undefined)).toBe('mock');
    expect(otpModeFor('real', undefined)).toBe('off');
    expect(otpModeFor('real', '')).toBe('off');
  });

  it('follows the three values', () => {
    expect(otpModeFor('mock', 'off')).toBe('off');
    expect(otpModeFor('mock', 'mock')).toBe('mock');
    expect(otpModeFor('mock', 'real')).toBe('real');
    expect(otpModeFor('real', 'off')).toBe('off');
    expect(otpModeFor('real', 'real')).toBe('real');
    expect(otpModeFor('real', ' REAL ')).toBe('real');
  });

  it('refuses the mock on the real server: an invented code proves nothing there', () => {
    expect(otpModeFor('real', 'mock')).toBe('off');
  });

  it('reads anything it does not know as the default', () => {
    expect(otpModeFor('real', 'yes')).toBe('off');
    expect(otpModeFor('mock', 'on')).toBe('mock');
  });
});

describe('off: the rule is disabled', () => {
  it('no parcel needs a code', () => {
    const otp = withEnv({ EXPO_PUBLIC_OTP: 'off' }, () => require('../services/otp') as OtpModule);
    expect(otp.otpNeeded(FEE_ONLY)).toBe(false);
    expect(otp.otpNeeded(NOTHING)).toBe(false);
    expect(otp.otpNeeded(NORMAL)).toBe(false);
    expect(otp.otpNeededIn('off', NOTHING)).toBe(false);
  });

  it('mock data: a code-required parcel delivers like any other — the call rule still applies', async () => {
    const api = withEnv({ EXPO_PUBLIC_OTP: 'off' }, () => require('../services/mock-api') as MockApi);
    const parcel = (await api.getActiveParcels()).find((p) => p.id === 'TRK-0F33A1C2')!;
    expect(parcel).toMatchObject({ cashToCollect: 8, deliveryFee: 8 });

    expect(await api.confirmDelivery(parcel.id, 8)).toMatchObject({ success: false, error: 'statusUpdate.callRequired' });
    await api.logCallAttempt(parcel.id);
    expect((await api.confirmDelivery(parcel.id, 8)).success).toBe(true);
  });

  it('real server, default (nothing set): the delivery is sent with no code', async () => {
    const api = withEnv(
      { EXPO_PUBLIC_API_MODE: 'real', EXPO_PUBLIC_API_WRITES: 'on', EXPO_PUBLIC_OTP: undefined },
      () => require('../services/real-api') as RealApi
    );
    const calls: string[] = [];
    const json = (status: number, body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    const item = {
      id: 1,
      sequenceOrder: 1,
      status: 'PENDING',
      parcel: { id: 1, trackingNumber: 'TUN-100-00000001', status: 'EN_COURS', recipientName: 'TEST', price: 10, deliveryFee: 10 },
    };
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      calls.push((init?.method ?? 'GET') + ' ' + url.replace('https://jibex.cloud', ''));
      if (url.endsWith('/api/auth/login')) {
        return json(200, {
          token: 't', role: 'DRIVER', portal: '/driver',
          user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
        });
      }
      if (url.includes('/api/runsheets/driver/')) return json(200, [{ id: 60, code: 'RS-1', status: 'IN_PROGRESS', items: [item] }]);
      return json(200, {});
    }) as unknown as typeof fetch;

    await api.login('driver', 'secret');
    await api.logCallAttempt('TUN-100-00000001');
    // Price 10, fee 10 would need a code — but the API does not exist, so the rule is off.
    expect((await api.confirmDelivery('TUN-100-00000001', 10)).success).toBe(true);
    expect(calls.filter((call) => call.startsWith('PUT '))).toEqual(['PUT /api/runsheets/items/1/status']);
  });
});

describe('mock: the code is made up on the phone', () => {
  it('needs a code, uses the mock service, and shows the test banner', async () => {
    const otp = withEnv({ EXPO_PUBLIC_OTP: 'mock' }, () => require('../services/otp') as OtpModule);
    expect(otp.otpNeeded(FEE_ONLY)).toBe(true);
    expect(otp.otpNeeded(NOTHING)).toBe(true);
    expect(otp.otpNeeded(NORMAL)).toBe(false);
    expect(otp.otpService).toBe(otp.mockOtpService);
    const sent = await otp.otpService.sendOtp('item-1');
    expect(sent.success && otp.testBannerCode('mock', sent.status)).toMatch(/^\d{6}$/);
  });

  it('refuses the delivery until the code is verified', async () => {
    const { api, otp } = withEnv({ EXPO_PUBLIC_OTP: 'mock' }, () => ({
      otp: require('../services/otp') as OtpModule,
      api: require('../services/mock-api') as MockApi,
    }));
    const parcel = (await api.getActiveParcels()).find((p) => p.id === 'TRK-0F33A1C2')!;
    await api.logCallAttempt(parcel.id);
    expect(await api.confirmDelivery(parcel.id, 8)).toMatchObject({ success: false, error: 'otp.errors.required' });
    const sent = await otp.otpService.sendOtp(otpItemId(parcel));
    if (!sent.success) throw new Error('no code');
    await otp.otpService.verifyOtp(otpItemId(parcel), sent.status.testCode!);
    expect((await api.confirmDelivery(parcel.id, 8)).success).toBe(true);
  });
});

describe('real: the real service', () => {
  it('needs a code, uses the real service, and never shows the banner', () => {
    const otp = withEnv({ EXPO_PUBLIC_API_MODE: 'real', EXPO_PUBLIC_OTP: 'real' }, () => require('../services/otp') as OtpModule);
    expect(otp.otpNeeded(FEE_ONLY)).toBe(true);
    expect(otp.otpService).toBe(otp.realOtpService);
    const leaked = { sentAt: 0, expiresAt: 1, resendAvailableAt: 1, resendsLeft: 3, attemptsLeft: 5, verified: false, testCode: '123456' };
    expect(otp.testBannerCode('real', leaked)).toBeNull();
    expect(otp.testBannerCode('off', leaked)).toBeNull();
  });

  it('EXPO_PUBLIC_OTP=mock on the real server is read as off: no banner, no block', () => {
    const otp = withEnv({ EXPO_PUBLIC_API_MODE: 'real', EXPO_PUBLIC_OTP: 'mock' }, () => require('../services/otp') as OtpModule);
    expect(otp.otpNeeded(FEE_ONLY)).toBe(false);
    expect(otp.otpService).toBe(otp.realOtpService);
  });
});

describe('the list card', () => {
  const t = i18next.getFixedT('fr');

  it('a parcel that needs a code: "CODE CLIENT" instead of "Payé"', () => {
    expect(cardCash(t, NOTHING, true)).toEqual({ label: null, codeBadge: 'CODE CLIENT', paid: false });
  });

  it('with a fee above 0, it also says "Frais de livraison : 10.000 TND"', () => {
    expect(cardCash(t, FEE_ONLY, true)).toEqual({
      label: 'Frais de livraison : 10.000 TND',
      codeBadge: 'CODE CLIENT',
      paid: false,
    });
  });

  it('a normal parcel is unchanged: the price', () => {
    // A normal parcel never needs a code, whatever the switch says.
    expect(cardCash(t, NORMAL, false)).toEqual({ label: '950.000 TND', codeBadge: null, paid: false });
  });

  it('with OTP off the card is as before: "Payé", or the amount', () => {
    expect(cardCash(t, NOTHING, false)).toEqual({ label: 'Payé', codeBadge: null, paid: true });
    expect(cardCash(t, FEE_ONLY, false)).toEqual({ label: '10.000 TND', codeBadge: null, paid: false });
  });
});
