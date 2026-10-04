/**
 * The delivery code (OTP) service.
 *
 * A parcel with nothing of value to collect (see `lib/otpRule`) can only be
 * marked delivered with the code the customer received. The server has no
 * API for it yet, so this file is the seam: the screens only know the
 * `OtpService` interface below.
 *
 * TO CONNECT THE REAL API (Jihed): implement `realOtpService` in this file
 * with the three calls described in docs/OTP.md. Nothing else changes — not the
 * screen, not the rules, not the tests of the rules.
 *
 * Which one is used is the `EXPO_PUBLIC_OTP` switch (see constants/backend):
 *  - `off`:  the rule is disabled. Nothing here is asked; `otpNeeded()` is
 *    false for every parcel, so no delivery waits for a code.
 *  - `mock`: `mockOtpService` makes the code up on the phone and hands it
 *    back as `testCode`, so the flow can be tested with no SMS. That code is
 *    shown in a "MODE TEST" banner.
 *  - `real`: `realOtpService`. Until the API exists it answers "not
 *    connected", and it never carries a `testCode`: the banner cannot appear.
 */
import { OTP_MODE, type OtpMode } from '../constants/backend';
import { otpRequiredFor } from '../lib/otpRule';
import {
  checkOtp,
  generateOtp,
  otpView,
  resendOtp as resendState,
  startOtp,
  type OtpState,
  type OtpView,
} from '../lib/otpSession';

/** Where a parcel's code stands. Times are absolute (ms since epoch), so a screen can count down. */
export interface OtpStatus {
  /** When the current code was sent. */
  sentAt: number;
  expiresAt: number;
  /** When "Renvoyer le code" becomes available. */
  resendAvailableAt: number;
  resendsLeft: number;
  attemptsLeft: number;
  verified: boolean;
  /**
   * MOCK ONLY: the code itself, for the "MODE TEST" banner. The real
   * service must never set it — the driver must get the code from the
   * customer, not from the app.
   */
  testCode?: string;
}

export type OtpResult = { success: true; status: OtpStatus } | { success: false; error: string; status?: OtpStatus };

export interface OtpService {
  /**
   * Sends the code for this parcel. Called when the driver opens "Livrer".
   * Opening the screen again does NOT send another code or reset any limit:
   * it answers with the code already on its way.
   */
  sendOtp(itemId: string): Promise<OtpResult>;
  /** Checks the code the driver typed. */
  verifyOtp(itemId: string, code: string): Promise<OtpResult>;
  /** "Renvoyer le code": after 60 s, at most 3 times. */
  resendOtp(itemId: string): Promise<OtpResult>;
  /** Whether this parcel's code was verified — what the delivery itself checks. */
  isVerified(itemId: string): boolean;
  /** Forgets the parcel's code, once it is delivered or failed. */
  clear(itemId: string): void;
}

function statusOf(state: OtpState, view: OtpView, now: number, withCode: boolean): OtpStatus {
  return {
    sentAt: state.sentAt,
    expiresAt: now + view.expiresInMs,
    resendAvailableAt: now + view.resendInMs,
    resendsLeft: view.resendsLeft,
    attemptsLeft: view.attemptsLeft,
    verified: view.verified,
    testCode: withCode ? state.code : undefined,
  };
}

/**
 * The mock: the same rules as the future API, kept in memory on the phone.
 * `now` and `random` can be replaced in tests.
 */
export function createMockOtpService(now: () => number = Date.now, random: () => number = Math.random): OtpService {
  const states = new Map<string, OtpState>();
  const answer = (state: OtpState): OtpStatus => statusOf(state, otpView(state, now()), now(), true);

  return {
    async sendOtp(itemId) {
      let state = states.get(itemId);
      if (!state) {
        state = startOtp(generateOtp(random), now());
        states.set(itemId, state);
      }
      return { success: true, status: answer(state) };
    },
    async verifyOtp(itemId, code) {
      const state = states.get(itemId);
      if (!state) return { success: false, error: 'otp.errors.notSent' };
      const checked = checkOtp(state, code, now());
      states.set(itemId, checked.state);
      return checked.ok
        ? { success: true, status: answer(checked.state) }
        : { success: false, error: checked.error, status: answer(checked.state) };
    },
    async resendOtp(itemId) {
      const state = states.get(itemId);
      if (!state) return { success: false, error: 'otp.errors.notSent' };
      const resent = resendState(state, generateOtp(random), now());
      states.set(itemId, resent.state);
      return resent.ok
        ? { success: true, status: answer(resent.state) }
        : { success: false, error: resent.error, status: answer(resent.state) };
    },
    isVerified(itemId) {
      return states.get(itemId)?.verified === true;
    },
    clear(itemId) {
      states.delete(itemId);
    },
  };
}

/**
 * The real service. TODO (Jihed): replace the three bodies with the calls in
 * docs/OTP.md. Until then nothing can be sent, so nothing can be verified, and a
 * parcel that needs a code cannot be marked delivered in real mode.
 * It must never return a `testCode`.
 */
export const realOtpService: OtpService = {
  async sendOtp() {
    return { success: false, error: 'otp.errors.notConnected' };
  },
  async verifyOtp() {
    return { success: false, error: 'otp.errors.notConnected' };
  },
  async resendOtp() {
    return { success: false, error: 'otp.errors.notConnected' };
  },
  isVerified() {
    return false;
  },
  clear() {},
};

export const mockOtpService = createMockOtpService();

/** The one place the mode is read. With the rule off the real service stands in; it is never asked. */
export function otpServiceFor(mode: OtpMode): OtpService {
  return mode === 'mock' ? mockOtpService : realOtpService;
}

export const otpService: OtpService = otpServiceFor(OTP_MODE);

/**
 * Whether THIS delivery needs the customer's code: the rule (nothing of
 * value to collect) AND the switch. With `EXPO_PUBLIC_OTP=off` it is false
 * for every parcel — screens, list cards and delivery calls all ask here, so
 * none of them can wait for a code the switch has turned off.
 */
export function otpNeededIn(mode: OtpMode, job: { cashToCollect: number; deliveryFee?: number }): boolean {
  return mode !== 'off' && otpRequiredFor(job);
}

export function otpNeeded(job: { cashToCollect: number; deliveryFee?: number }): boolean {
  return otpNeededIn(OTP_MODE, job);
}

/**
 * The code to show in the "MODE TEST" banner, or null. Only ever with
 * `EXPO_PUBLIC_OTP=mock`, which itself only exists on mock data: with `real`
 * or `off` this is null whatever the status says, so the banner cannot appear
 * even if a `testCode` slipped through.
 */
export function testBannerCode(mode: OtpMode, status: OtpStatus | null | undefined): string | null {
  if (mode !== 'mock') return null;
  return status?.testCode ?? null;
}
