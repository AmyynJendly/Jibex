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
  fromAgency: string;
  /** Agency they are returning to — whoever originally shipped them. */
  toAgency: string;
  parcelCount: number;
  /** The outbound transfer these parcels failed to clear, when known. */
  relatedTransferId?: string;
  /** Depot/hub where the driver collects them. */
  location: string;
  scheduledAt: string;
  /**
   * Real server: a return goes back in two steps. TO_LOAD — still at the
   * agency; the driver confirms loading all of them at once. TO_HAND_BACK —
   * in the van; the driver confirms handing each one to its sender.
   * Absent on mock data, which has a single Confirm step.
   */
  stage?: 'TO_LOAD' | 'TO_HAND_BACK';
  /**
   * What the real server says. It sends returns as single parcels, not
   * batches: each one becomes a return of one parcel. Absent on mock data.
   */
  server?: {
    parcelId: string;
    trackingNumber: string;
    /** RETOUR_A_CHARGER (still to load) or EN_TRANSIT_RETOUR (loaded, to hand back). */
    parcelStatus?: string;
    senderName?: string;
    senderPhone?: string;
    senderAddress?: string;
    returnType?: string;
  };
}
