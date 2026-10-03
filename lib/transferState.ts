import type { Transfer } from '../types';

/**
 * Where a transfer stands, from the driver's side.
 *
 * - `toLoad`: validated by the origin agency, waiting for this driver to
 *   scan the parcels and confirm the pickup.
 * - `onTheWay`: the driver confirmed. Their part is over: nothing more to
 *   press. The transfer closes when the destination agency scans the
 *   parcels in — on the web, not on this phone.
 * - `closed`: received by the destination agency.
 */
export type TransferStage = 'toLoad' | 'onTheWay' | 'closed';

export function transferStage(transfer: Pick<Transfer, 'status' | 'awaitingPickupConfirmation'>): TransferStage {
  if (transfer.status === 'COMPLETED') return 'closed';
  return transfer.awaitingPickupConfirmation ? 'toLoad' : 'onTheWay';
}

/**
 * An agency's name as it reads after "l'agence": the sentence already says
 * "agence", so "Agence Sfax" becomes "Sfax". Names that don't start with the
 * word are kept whole.
 */
export function agencyShortName(name: string): string {
  const trimmed = name.trim();
  const short = trimmed.replace(/^agence\s+/i, '').trim();
  return short || trimmed;
}

/** One line of a transfer's history: what happened, when, and whether it has. */
export interface TimelineStep {
  key: 'created' | 'ready' | 'taken' | 'closed' | 'cancelled';
  at?: string;
  done: boolean;
}

/**
 * The transfer's history, like the Android app's "Historique":
 * Créé → Prêt pour chargement → Pris en charge par le chauffeur → Terminé.
 * A cancelled transfer stops at "Annulé". A step with no date yet is not done.
 */
export function transferTimeline(detail: {
  createdAt?: string;
  readyAt?: string;
  takenAt?: string;
  closedAt?: string;
  cancelledAt?: string;
}): TimelineStep[] {
  const steps: TimelineStep[] = [{ key: 'created', at: detail.createdAt, done: true }];
  if (detail.cancelledAt) {
    steps.push({ key: 'cancelled', at: detail.cancelledAt, done: true });
    return steps;
  }
  steps.push({ key: 'ready', at: detail.readyAt, done: !!detail.readyAt });
  steps.push({ key: 'taken', at: detail.takenAt, done: !!detail.takenAt });
  steps.push({ key: 'closed', at: detail.closedAt, done: !!detail.closedAt });
  return steps;
}

/** "02/10/2026 21:13" — the server's local date-time, printed as it was sent. */
export function formatStamp(value: string | undefined): string | undefined {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value) : null;
  return match ? [match[3], match[2], match[1]].join('/') + ' ' + match[4] + ':' + match[5] : undefined;
}

/** A transfer opens its detail screen only while it is ongoing: History stays read-only cards. */
export function opensDetail(transfer: Pick<Transfer, 'status' | 'awaitingPickupConfirmation'>): boolean {
  return transferStage(transfer) !== 'closed';
}
