export type PickupStatus = 'scheduled' | 'completed';

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
