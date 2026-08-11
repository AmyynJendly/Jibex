/** Matches the real backend's uppercase enum strings. */
export type PickupStatus = 'SCHEDULED' | 'COMPLETED';

export interface Pickup {
  id: string;
  businessName: string;
  address: string;
  status: PickupStatus;
  requestedByDate: string;
  /** Display window, e.g. "11:30–12:00". */
  timeWindow: string;
  packageCount: number;
}
