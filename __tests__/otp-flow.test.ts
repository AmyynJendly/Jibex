/**
 * The delivery code (OTP) flow: resend timer and limit, wrong-code limit,
 * the failure path, and the rule that the test banner never shows in real
 * mode. The rule for WHEN a code is required is in otp-rule.test.ts.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import fr from '../lib/i18n/fr';
import { otpItemId, otpRequiredFor } from '../lib/otpRule';
import {
  OTP_LENGTH,
  OTP_MAX_RESENDS,
  OTP_MAX_WRONG,
  OTP_RESEND_WAIT_MS,
  OTP_TTL_MS,
  checkOtp,
  generateOtp,
  otpView,
  resendOtp,
  startOtp,
} from '../lib/otpSession';
import { createMockOtpService, otpServiceFor, realOtpService, testBannerCode } from '../services/otp';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** A mock service with a clock the test moves by hand, and codes 111111, 222222, 333333… */
function service() {
  let now = 1_000_000;
  let n = 0;
  const otp = createMockOtpService(
    () => now,
    () => {
      // One digit per call: every code is six times the same digit.
      const digit = (Math.floor(n / OTP_LENGTH) % 9) + 1;
      n += 1;
      return digit / 10;
    }
  );
  return { otp, advance: (ms: number) => (now += ms) };
}

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

describe('the code', () => {
  it('has 6 digits', () => {
    expect(OTP_LENGTH).toBe(6);
    for (let i = 0; i < 50; i += 1) expect(generateOtp()).toMatch(/^\d{6}$/);
    expect(generateOtp(() => 0.999999)).toBe('999999');
    expect(generateOtp(() => 0)).toBe('000000');
  });

  it('is valid 10 minutes', () => {
    const state = startOtp('123456', 0);
    expect(OTP_TTL_MS).toBe(10 * MINUTE);
    expect(otpView(state, 10 * MINUTE - 1).expired).toBe(false);
    expect(otpView(state, 10 * MINUTE).expired).toBe(true);
    // Even the right code is refused once expired.
    expect(checkOtp(state, '123456', 10 * MINUTE)).toMatchObject({ ok: false, error: 'otp.errors.expired' });
  });

  it('opens the delivery only when it is right', () => {
    const state = startOtp('123456', 0);
    expect(checkOtp(state, '000000', 1).ok).toBe(false);
    const good = checkOtp(state, '123456', 1);
    expect(good.ok).toBe(true);
    expect(good.state.verified).toBe(true);
  });
});

describe('opening "Livrer"', () => {
  it('sends a code, and says when it expires and when a resend is allowed', async () => {
    const { otp } = service();
    const sent = await otp.sendOtp('item-1');
    expect(sent).toMatchObject({ success: true });
    if (!sent.success) return;
    expect(sent.status.testCode).toBe('111111');
    expect(sent.status.expiresAt - sent.status.sentAt).toBe(10 * MINUTE);
    expect(sent.status.resendAvailableAt - sent.status.sentAt).toBe(60 * SECOND);
    expect(sent.status).toMatchObject({ resendsLeft: 3, attemptsLeft: 5, verified: false });
    expect(fr.otp.sent).toBe('Code envoyé au client');
  });

  it('opening the screen again does not send another code or reset anything', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    await otp.verifyOtp('item-1', '000000');
    advance(30 * SECOND);
    const again = await otp.sendOtp('item-1');
    expect(again.success && again.status.testCode).toBe('111111');
    expect(again.success && again.status.attemptsLeft).toBe(4);
    expect(again.success && again.status.resendsLeft).toBe(3);
  });

  it('keeps each parcel’s code apart', async () => {
    const { otp } = service();
    const a = await otp.sendOtp('item-1');
    const b = await otp.sendOtp('item-2');
    expect(a.success && a.status.testCode).toBe('111111');
    expect(b.success && b.status.testCode).toBe('222222');
    expect((await otp.verifyOtp('item-2', '111111')).success).toBe(false);
  });
});

describe('"Renvoyer le code"', () => {
  it('is refused before 60 s', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    advance(59 * SECOND);
    expect(await otp.resendOtp('item-1')).toMatchObject({ success: false, error: 'otp.errors.tooSoon' });
    expect(OTP_RESEND_WAIT_MS).toBe(60 * SECOND);
  });

  it('is allowed after 60 s, with a new code; the old one stops working', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    advance(60 * SECOND);
    const resent = await otp.resendOtp('item-1');
    expect(resent).toMatchObject({ success: true });
    expect(resent.success && resent.status.testCode).toBe('222222');
    expect(resent.success && resent.status.resendsLeft).toBe(2);
    expect((await otp.verifyOtp('item-1', '111111')).success).toBe(false);
    expect((await otp.verifyOtp('item-1', '222222')).success).toBe(true);
  });

  it('starts its own 60 s wait again', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    advance(60 * SECOND);
    await otp.resendOtp('item-1');
    advance(30 * SECOND);
    expect(await otp.resendOtp('item-1')).toMatchObject({ success: false, error: 'otp.errors.tooSoon' });
  });

  it('works 3 times, never a 4th', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    for (let i = 1; i <= OTP_MAX_RESENDS; i += 1) {
      advance(60 * SECOND);
      const resent = await otp.resendOtp('item-1');
      expect(resent.success && resent.status.resendsLeft).toBe(OTP_MAX_RESENDS - i);
    }
    advance(5 * MINUTE);
    expect(await otp.resendOtp('item-1')).toMatchObject({ success: false, error: 'otp.errors.noResendsLeft' });
    expect(OTP_MAX_RESENDS).toBe(3);
  });

  it('is refused for a parcel no code was sent for', async () => {
    const { otp } = service();
    expect(await otp.resendOtp('nope')).toMatchObject({ success: false, error: 'otp.errors.notSent' });
    expect(await otp.verifyOtp('nope', '111111')).toMatchObject({ success: false, error: 'otp.errors.notSent' });
  });
});

describe('wrong codes', () => {
  it('counts down, then blocks at the 5th: "Code bloqué — renvoyez un nouveau code"', async () => {
    const { otp } = service();
    await otp.sendOtp('item-1');
    for (let left = 4; left >= 1; left -= 1) {
      const wrong = await otp.verifyOtp('item-1', '000000');
      expect(wrong).toMatchObject({ success: false, error: 'otp.errors.incorrect' });
      expect(wrong.status?.attemptsLeft).toBe(left);
    }
    const fifth = await otp.verifyOtp('item-1', '000000');
    expect(fifth).toMatchObject({ success: false, error: 'otp.errors.blocked' });
    expect(fifth.status?.attemptsLeft).toBe(0);
    expect(OTP_MAX_WRONG).toBe(5);
    expect(fr.otp.errors.blocked).toBe('Code bloqué — renvoyez un nouveau code');
  });

  it('once blocked, even the right code is refused', async () => {
    const { otp } = service();
    await otp.sendOtp('item-1');
    for (let i = 0; i < 5; i += 1) await otp.verifyOtp('item-1', '000000');
    expect(await otp.verifyOtp('item-1', '111111')).toMatchObject({ success: false, error: 'otp.errors.blocked' });
    expect(otp.isVerified('item-1')).toBe(false);
  });

  it('a new code unblocks, with 5 tries again', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    for (let i = 0; i < 5; i += 1) await otp.verifyOtp('item-1', '000000');
    advance(60 * SECOND);
    const resent = await otp.resendOtp('item-1');
    expect(resent.success && resent.status.attemptsLeft).toBe(5);
    expect((await otp.verifyOtp('item-1', '222222')).success).toBe(true);
  });
});

describe('the failure path', () => {
  it('after 3 resends with no success: "Impossible de valider — marquez un échec"', () => {
    let state = startOtp('111111', 0);
    let now = 0;
    for (const code of ['222222', '333333', '444444']) {
      now += OTP_RESEND_WAIT_MS;
      const resent = resendOtp(state, code, now);
      expect(resent.ok).toBe(true);
      state = resent.state;
    }
    expect(otpView(state, now)).toMatchObject({ resendsLeft: 0, exhausted: true, canResend: false });
    expect(fr.otp.exhaustedTitle).toBe('Impossible de valider — marquez un échec');
    expect(fr.otp.markFailed).toBe('Marquer un échec');
  });

  it('is not shown while a resend is still possible', () => {
    const state = startOtp('111111', 0);
    expect(otpView(state, 0).exhausted).toBe(false);
    expect(otpView(resendOtp(state, '222222', MINUTE).state, MINUTE).exhausted).toBe(false);
  });

  it('with the last code blocked there is nothing left to type and nothing to resend', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    for (let i = 0; i < 3; i += 1) {
      advance(60 * SECOND);
      await otp.resendOtp('item-1');
    }
    for (let i = 0; i < 5; i += 1) await otp.verifyOtp('item-1', '000000');
    advance(10 * MINUTE);
    expect(await otp.verifyOtp('item-1', '444444')).toMatchObject({ success: false });
    expect(await otp.resendOtp('item-1')).toMatchObject({ success: false, error: 'otp.errors.noResendsLeft' });
    expect(otp.isVerified('item-1')).toBe(false);
  });

  it('the last code still works if the customer finally gives it', async () => {
    const { otp, advance } = service();
    await otp.sendOtp('item-1');
    for (let i = 0; i < 3; i += 1) {
      advance(60 * SECOND);
      await otp.resendOtp('item-1');
    }
    expect((await otp.verifyOtp('item-1', '444444')).success).toBe(true);
    expect(otp.isVerified('item-1')).toBe(true);
  });
});

describe('no delivery without a correct code', () => {
  type MockApi = typeof import('../services/mock-api');
  type OtpModule = typeof import('../services/otp');

  function fresh(): { api: MockApi; otp: OtpModule } {
    let api!: MockApi;
    let otp!: OtpModule;
    jest.isolateModules(() => {
      otp = require('../services/otp');
      api = require('../services/mock-api');
    });
    return { api, otp };
  }

  it('the mock refuses to deliver a code-required parcel until its code is verified', async () => {
    const { api, otp } = fresh();
    const parcel = (await api.getActiveParcels()).find((p) => otpRequiredFor(p) && p.cashToCollect > 0);
    if (!parcel) throw new Error('seed data has no fee-only parcel on a confirmed run');
    await api.logCallAttempt(parcel.id);

    expect(await api.confirmDelivery(parcel.id, parcel.cashToCollect)).toMatchObject({ success: false, error: 'otp.errors.required' });

    const sent = await otp.otpService.sendOtp(otpItemId(parcel));
    if (!sent.success) throw new Error('mock did not send a code');
    expect((await otp.otpService.verifyOtp(otpItemId(parcel), 'x')).success).toBe(false);
    expect(await api.confirmDelivery(parcel.id, parcel.cashToCollect)).toMatchObject({ success: false, error: 'otp.errors.required' });

    expect((await otp.otpService.verifyOtp(otpItemId(parcel), sent.status.testCode!)).success).toBe(true);
    const delivered = await api.confirmDelivery(parcel.id, parcel.cashToCollect);
    expect(delivered.success).toBe(true);
    expect(delivered.job?.cashCollected).toBe(parcel.cashToCollect);
  });

  it('the call-before-delivery rule still comes first', async () => {
    const { api, otp } = fresh();
    const parcel = (await api.getActiveParcels()).find((p) => otpRequiredFor(p))!;
    const sent = await otp.otpService.sendOtp(otpItemId(parcel));
    if (!sent.success) throw new Error('mock did not send a code');
    await otp.otpService.verifyOtp(otpItemId(parcel), sent.status.testCode!);
    // A correct code, but the customer was never called.
    expect(await api.confirmDelivery(parcel.id, 0)).toMatchObject({ success: false, error: 'statusUpdate.callRequired' });
  });

  it('a normal parcel is delivered with no code at all', async () => {
    const { api } = fresh();
    const runs = await api.getRunsheets();
    const ready = new Set(runs.filter((r) => !r.needsConfirmation && r.status !== 'VALIDE').flatMap((r) => r.stopIds));
    const parcel = (await api.getActiveParcels()).find((p) => ready.has(p.id) && !otpRequiredFor(p))!;
    await api.logCallAttempt(parcel.id);
    expect((await api.confirmDelivery(parcel.id, parcel.cashToCollect)).success).toBe(true);
  });

  it('a failed delivery never needs the code', async () => {
    const { api } = fresh();
    const parcel = (await api.getActiveParcels()).find((p) => otpRequiredFor(p))!;
    expect((await api.markDeliveryFailed(parcel.id, 'ABSENT')).success).toBe(true);
  });
});

describe('the real OTP service', () => {
  it('never shows the test banner, whatever the status carries', () => {
    const leaked = { sentAt: 0, expiresAt: 1, resendAvailableAt: 1, resendsLeft: 3, attemptsLeft: 5, verified: false, testCode: '123456' };
    expect(testBannerCode('real', leaked)).toBeNull();
    expect(testBannerCode('real', null)).toBeNull();
    // Mock mode shows it, so the flow can be tested with no SMS.
    expect(testBannerCode('mock', leaked)).toBe('123456');
    expect(testBannerCode('mock', { ...leaked, testCode: undefined })).toBeNull();
  });

  it('uses the real service, which never hands a code to the app', async () => {
    expect(otpServiceFor('real')).toBe(realOtpService);
    expect(otpServiceFor('mock')).not.toBe(realOtpService);
    for (const answer of [
      await realOtpService.sendOtp('1'),
      await realOtpService.verifyOtp('1', '123456'),
      await realOtpService.resendOtp('1'),
    ]) {
      expect(answer.success).toBe(false);
      expect(JSON.stringify(answer)).not.toMatch(/testCode/);
    }
  });

  it('until the API exists, nothing is verified: a code-required parcel cannot be delivered', async () => {
    expect(realOtpService.isVerified('1')).toBe(false);
    expect(await realOtpService.sendOtp('1')).toEqual({ success: false, error: 'otp.errors.notConnected' });
    expect(fr.otp.errors.notConnected).toMatch(/serveur/);
  });

  it('with EXPO_PUBLIC_OTP=real, the real delivery call refuses a code-required parcel before sending anything', async () => {
    process.env.EXPO_PUBLIC_API_MODE = 'real';
    process.env.EXPO_PUBLIC_API_WRITES = 'on';
    process.env.EXPO_PUBLIC_OTP = 'real';
    let api!: typeof import('../services/real-api');
    jest.isolateModules(() => {
      api = require('../services/real-api');
    });
    const calls: string[] = [];
    const json = (status: number, body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    const item = (id: number, price: number, deliveryFee: number) => ({
      id,
      sequenceOrder: id,
      status: 'PENDING',
      parcel: { id, trackingNumber: 'TUN-100-0000000' + id, status: 'EN_COURS', recipientName: 'TEST', price, deliveryFee },
    });
    globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
      calls.push((init?.method ?? 'GET') + ' ' + url.replace('https://jibex.cloud', ''));
      if (url.endsWith('/api/auth/login')) {
        return json(200, { token: 't', role: 'DRIVER', portal: '/driver', user: { id: 7, driverId: 31, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true } });
      }
      if (url.includes('/api/runsheets/driver/')) {
        return json(200, [{ id: 60, code: 'RS-1', status: 'IN_PROGRESS', items: [item(1, 10, 10), item(2, 950, 10)] }]);
      }
      return json(200, {});
    }) as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await api.login('driver', 'secret');
      await api.logCallAttempt('TUN-100-00000001');
      await api.logCallAttempt('TUN-100-00000002');
      calls.length = 0;

      // Price 10, fee 10: needs the code. Nothing is written.
      expect(await api.confirmDelivery('TUN-100-00000001', 10)).toMatchObject({ success: false, error: 'otp.errors.required' });
      expect(calls.filter((call) => call.startsWith('PUT '))).toEqual([]);

      // Price 950, fee 10: a normal delivery goes through.
      expect((await api.confirmDelivery('TUN-100-00000002', 950)).success).toBe(true);
      expect(calls.filter((call) => call.startsWith('PUT '))).toEqual(['PUT /api/runsheets/items/2/status']);
    } finally {
      delete process.env.EXPO_PUBLIC_API_MODE;
      delete process.env.EXPO_PUBLIC_API_WRITES;
      delete process.env.EXPO_PUBLIC_OTP;
    }
  });
});

describe('what the code screen shows', () => {
  const { countdown, otpScreenState } = require('../lib/otpSession') as typeof import('../lib/otpSession');
  const base = { expiresAt: 600_000, resendAvailableAt: 60_000, resendsLeft: 3, attemptsLeft: 5, verified: false };

  it('counts the resend down, second by second', () => {
    expect(otpScreenState(base, 0)).toMatchObject({ resendInSeconds: 60, canResend: false, canType: true });
    expect(otpScreenState(base, 18_500)).toMatchObject({ resendInSeconds: 42, canResend: false });
    expect(otpScreenState(base, 60_000)).toMatchObject({ resendInSeconds: 0, canResend: true });
    expect(countdown(42)).toBe('0:42');
    expect(countdown(60)).toBe('1:00');
    expect(countdown(0)).toBe('0:00');
  });

  it('"Livré" is only ever on after a correct code', () => {
    expect(otpScreenState(base, 0).verified).toBe(false);
    expect(otpScreenState({ ...base, verified: true }, 0)).toMatchObject({ verified: true, canType: false, canResend: false, exhausted: false });
  });

  it('a blocked or expired code cannot be typed', () => {
    expect(otpScreenState({ ...base, attemptsLeft: 0 }, 0)).toMatchObject({ blocked: true, canType: false });
    expect(otpScreenState(base, 600_000)).toMatchObject({ expired: true, canType: false });
  });

  it('with no resend left it shows the failure path — and stays there', () => {
    const last = { ...base, resendsLeft: 0 };
    expect(otpScreenState(last, 0)).toMatchObject({ exhausted: true, canResend: false });
    // The last code may still be typed while it is alive…
    expect(otpScreenState(last, 0).canType).toBe(true);
    // …and once it is blocked or expired there is nothing left but the failure screen.
    expect(otpScreenState({ ...last, attemptsLeft: 0 }, 0)).toMatchObject({ exhausted: true, canType: false });
    expect(otpScreenState(last, 700_000)).toMatchObject({ exhausted: true, canType: false, canResend: false });
  });
});
