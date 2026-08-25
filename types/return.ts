/** Matches the real backend's uppercase enum strings. */
export type ReturnStatus = 'PENDING_PICKUP' | 'PROCESSED';

/**
 * The inverse of a transfer: whatever the receiving agency couldn't sell or
 * deliver comes back. If Agence Sousse sent 500 and Agence Sfax moved 450,
 * the remaining 50 travel back as one return batch.
 */
export interface Return {
  id: string;
  status: ReturnStatus;
  /** Agency sending the undelivered parcels back. */
  fromAgency: string;
  /** Agency they are returning to — whoever originally shipped them. */
  toAgency: string;
  /** How many parcels are coming back. */
  parcelCount: number;
  /** The outbound transfer these parcels failed to clear, when known. */
  relatedTransferId?: string;
  /** Depot/hub where the driver collects them. */
  location: string;
  scheduledAt: string;
  /** Local device photo URIs documenting damage — populated via `attachReturnPhoto`. */
  photoUris?: string[];
}
