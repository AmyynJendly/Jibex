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
  /** Set when delivery is confirmed via photo instead of OTP. */
  proofPhotoUri?: string;
}
