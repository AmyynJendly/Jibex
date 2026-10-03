/**
 * The rules of one delivery code (OTP), with no server and no clock of its
 * own — so they can be tested, and so the mock service and the future real
 * one behave the same way.
 *
 *  - A code has 6 digits and is valid 10 minutes.
 *  - 5 wrong codes block it: only a new code unblocks.
 *  - A new code can be asked 60 s after the last one, at most 3 times.
 *  - With no resend left and the last code blocked or expired, there is no
 *    way to validate: the driver records a failed delivery instead.
 *  - Nothing here ever lets a delivery through without a correct code.
 */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_RESEND_WAIT_MS = 60_000;
export const OTP_MAX_RESENDS = 3;
export const OTP_MAX_WRONG = 5;

export type OtpError =
  /** Wrong code, some tries left. */
  | 'otp.errors.incorrect'
  /** The 10 minutes are over. */
  | 'otp.errors.expired'
  /** 5 wrong codes: "Code bloqué — renvoyez un nouveau code". */
  | 'otp.errors.blocked'
  /** Asked for a new code before the 60 s were over. */
  | 'otp.errors.tooSoon'
  /** The 3 resends are used. */
  | 'otp.errors.noResendsLeft'
  /** No code was sent for this parcel yet. */
  | 'otp.errors.notSent';

export interface OtpState {
  code: string;
  /** When the current code was sent (ms). */
  sentAt: number;
  /** Wrong tries on the current code. */
  wrong: number;
  /** New codes asked for since the first one. */
  resends: number;
  verified: boolean;
}

/** What a screen needs to know about a code, at a given moment. */
export interface OtpView {
  verified: boolean;
  /** 5 wrong codes on the current one. */
  blocked: boolean;
  /** The current code is more than 10 minutes old. */
  expired: boolean;
  attemptsLeft: number;
  resendsLeft: number;
  /** Milliseconds until "Renvoyer le code" is allowed. 0 = now. */
  resendInMs: number;
  expiresInMs: number;
  /** The code can still be typed. */
  canType: boolean;
  /** A new code can be asked for right now. */
  canResend: boolean;
  /**
   * The 3 resends are used and the delivery is still not validated:
   * "Impossible de valider — marquez un échec".
   */
  exhausted: boolean;
}

/** A 6-digit code, from a source of randomness in [0, 1). */
export function generateOtp(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i += 1) code += String(Math.min(9, Math.floor(random() * 10)));
  return code;
}

/** A first code was just sent. */
export function startOtp(code: string, now: number): OtpState {
  return { code, sentAt: now, wrong: 0, resends: 0, verified: false };
}

export function otpView(state: OtpState, now: number): OtpView {
  const blocked = state.wrong >= OTP_MAX_WRONG;
  const expired = now - state.sentAt >= OTP_TTL_MS;
  const resendsLeft = Math.max(0, OTP_MAX_RESENDS - state.resends);
  const resendInMs = Math.max(0, state.sentAt + OTP_RESEND_WAIT_MS - now);
  return {
    verified: state.verified,
    blocked,
    expired,
    attemptsLeft: Math.max(0, OTP_MAX_WRONG - state.wrong),
    resendsLeft,
    resendInMs,
    expiresInMs: Math.max(0, state.sentAt + OTP_TTL_MS - now),
    canType: !state.verified && !blocked && !expired,
    canResend: !state.verified && resendsLeft > 0 && resendInMs === 0,
    exhausted: !state.verified && resendsLeft === 0,
  };
}

/** The driver typed a code. Returns the new state and whether it was right. */
export function checkOtp(
  state: OtpState,
  input: string,
  now: number
): { state: OtpState; ok: true } | { state: OtpState; ok: false; error: OtpError } {
  if (state.verified) return { state, ok: true };
  const view = otpView(state, now);
  // A blocked or expired code is refused even when it is the right one.
  if (view.blocked) return { state, ok: false, error: 'otp.errors.blocked' };
  if (view.expired) return { state, ok: false, error: 'otp.errors.expired' };
  if (input.trim() === state.code) return { state: { ...state, verified: true }, ok: true };
  const next = { ...state, wrong: state.wrong + 1 };
  return { state: next, ok: false, error: next.wrong >= OTP_MAX_WRONG ? 'otp.errors.blocked' : 'otp.errors.incorrect' };
}

/** "Renvoyer le code": a new code replaces the old one and the wrong-code count starts again. */
export function resendOtp(
  state: OtpState,
  code: string,
  now: number
): { state: OtpState; ok: true } | { state: OtpState; ok: false; error: OtpError } {
  if (state.verified) return { state, ok: true };
  const view = otpView(state, now);
  if (view.resendsLeft === 0) return { state, ok: false, error: 'otp.errors.noResendsLeft' };
  if (view.resendInMs > 0) return { state, ok: false, error: 'otp.errors.tooSoon' };
  return { state: { code, sentAt: now, wrong: 0, resends: state.resends + 1, verified: false }, ok: true };
}
