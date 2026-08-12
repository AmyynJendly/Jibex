/** Matches the real backend's uppercase enum strings. */
export type PickupStatus = 'SCHEDULED' | 'COMPLETED';

export interface PickupParcel {
  /** "TRK-" + 8 uppercase hex chars, e.g. "TRK-5DF3697E". */
  trackingNumber: string;
  contactName: string;
  address: string;
  codAmount: number;
}

export interface Pickup {
  id: string;
  businessName: string;
  address: string;
  status: PickupStatus;
  requestedByDate: string;
  /** Display window, e.g. "11:30–12:00". */
  timeWindow: string;
  packageCount: number;
  contactName: string;
  contactPhone: string;
  parcels: PickupParcel[];
}
