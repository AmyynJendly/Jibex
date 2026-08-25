/** Matches the real backend's uppercase enum strings. */
export type TransferStatus = 'IN_PROGRESS' | 'COMPLETED';

/**
 * A batch of parcels moving between two agencies — e.g. Agence Sousse sends
 * 500 parcels to Agence Sfax for that branch to distribute. Structurally the
 * same idea as a runsheet, but the counterparty is an agency rather than a
 * customer.
 */
export interface Transfer {
  id: string;
  status: TransferStatus;
  /** Agency sending the batch. */
  originAgency: string;
  /** Agency receiving it. */
  destinationAgency: string;
  parcelCount: number;
  /** Depot/hub where the handover happens. */
  location: string;
  scheduledAt: string;
}
