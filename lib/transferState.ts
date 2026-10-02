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
