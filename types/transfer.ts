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
  /**
   * Real server: the batch is ready and waiting for this driver to confirm
   * they've loaded it (READY_FOR_PICKUP). Shows "Confirm pickup".
   */
  awaitingPickupConfirmation?: boolean;
  /** What the real server says beyond the fields above. Absent on mock data. */
  server?: TransferServerInfo;
}

/** The backend's transfer kinds. */
export type TransferType = 'INTER_AGENCY' | 'HUB_RELAY' | 'RETURN' | 'RETURN_TO_SENDER';

export interface TransferServerInfo {
  /** The numeric id — what `confirm-pickup` takes. */
  transferId: string;
  /** Raw status, including legacy values our two states fold together. */
  status?: string;
  /** Raw type; `transferType` is set when it's one we know. */
  rawType?: string;
  transferType?: TransferType;
  fromCompany?: string;
  toCompany?: string;
  driverName?: string;
  vehicleRegistration?: string;
  notes?: string;
  parcelTrackingNumbers: string[];
  scannedCount?: number;
  scanDeparture: boolean;
  scanArrival: boolean;
  missingParcels: number;
  extraParcels: number;
  damagedParcels: number;
  discrepancyNotes?: string;
  createdAt?: string;
  validatedAt?: string;
  shippedAt?: string;
  confirmedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  closedAt?: string;
  cancelledAt?: string;
}
