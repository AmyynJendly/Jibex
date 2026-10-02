import type { TFunction } from 'i18next';

/**
 * Which delivery attempt a parcel is on.
 *
 * The server counts the attempts that already failed (`deliveryAttempts`):
 * each time a failed parcel is scanned back into the depot, the count goes up
 * by one ("Retour dépôt — tentative n°1/3"). So a parcel going out with a
 * count of 1 is on its second attempt.
 *
 * The agency allows three. At the third the depot warns "Dernière tentative
 * autorisée"; in the live test the server still accepted a fourth run, after
 * which the parcel went to the after-sales desk. The driver should know which
 * attempt they are holding before they knock: a third attempt deserves one
 * more call.
 */
export const MAX_ATTEMPTS = 3;

export interface AttemptInfo {
  /** The attempt this delivery is: 1 for a parcel that has never failed. */
  number: number;
  max: number;
  /** The last one the agency allows, or beyond it. */
  last: boolean;
  /** Past what the agency allows (a fourth run). */
  over: boolean;
}

export function attemptInfo(deliveryAttempts: number | null | undefined): AttemptInfo {
  const failed = typeof deliveryAttempts === 'number' && deliveryAttempts > 0 ? Math.floor(deliveryAttempts) : 0;
  const number = failed + 1;
  return { number, max: MAX_ATTEMPTS, last: number >= MAX_ATTEMPTS, over: number > MAX_ATTEMPTS };
}

/** "Tentative 2/3", or "Tentative 4 — au-delà des 3 autorisées" past the limit. */
export function attemptLabel(t: TFunction, info: AttemptInfo): string {
  return t(info.over ? 'attempts.over' : 'attempts.label', { number: info.number, max: info.max });
}
