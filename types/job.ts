/** Matches the real backend's uppercase enum strings — resolve to a display label via `enumLabel()`, never render raw. */
export type JobStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export interface PackageInfo {
  count: number;
  weightLbs: number;
  fragile: boolean;
  note?: string;
}

/** Why a delivery attempt failed — drives the Can't Deliver reason picker. Matches the real backend's uppercase enum strings. */
export type DeliveryFailureReason =
  | 'CUSTOMER_ABSENT'
  | 'REFUSED'
  | 'INCORRECT_ADDRESS'
  | 'INCOMPLETE_ADDRESS'
  | 'PHONE_UNREACHABLE'
  | 'NO_ANSWER'
  | 'OTHER';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Job {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  packageInfo: PackageInfo;
  status: JobStatus;
  /** Amount owed by the customer on delivery (COD is ~99% of orders). */
  cashToCollect: number;
  /** Set once the driver confirms delivery; may differ from cashToCollect. */
  cashCollected?: number;
  /** Used for nearest-neighbor route ordering and "open in Maps" navigation. */
  location: GeoPoint;
  /** ISO time the customer needs this by, if any — drives Home's time-sensitive callout. */
  deliverBy?: string;
  /** Set when a delivery attempt fails via the Can't Deliver flow. */
  failureReason?: DeliveryFailureReason;
  failureNote?: string;
  /**
   * Driver's GPS fix at the moment they logged the failure reason, if a fix
   * was available — proof they were actually at the address, not just
   * clearing the stop from their list. Best-effort: absent when location
   * permission was denied or unavailable, never blocks logging the failure.
   */
  failureLocation?: GeoPoint;
  /** Set when delivery is confirmed via photo instead of OTP. */
  proofPhotoUri?: string;
  /**
   * How many times the driver has pressed Call for this parcel. A delivery
   * can't be confirmed at zero — the driver must have tried to reach the
   * customer first (see `logCallAttempt`).
   */
  callAttempts: number;
  /** ISO timestamp of the most recent call attempt, if any. */
  lastCallAt?: string;
}
