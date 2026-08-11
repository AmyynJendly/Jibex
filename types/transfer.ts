/** Matches the real backend's uppercase enum strings. */
export type TransferStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Transfer {
  id: string;
  status: TransferStatus;
  /** Runsheet route label handing off, e.g. "Route 12". */
  origin: string;
  /** Runsheet route label receiving, e.g. "Route 7". */
  destination: string;
  itemCount: number;
  /** Depot/hub where the handoff happens, e.g. "Dépôt Sahloul". */
  location: string;
  scheduledAt: string;
}
