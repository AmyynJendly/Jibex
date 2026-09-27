/** Matches the real backend's uppercase enum strings — resolve to a display label via `enumLabel()`, never render raw. */
export type JobStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export interface PackageInfo {
  count: number;
  weightKg: number;
  fragile: boolean;
  note?: string;
}

/** Why a delivery attempt failed — drives the Can't Deliver reason picker. Matches the real backend's uppercase enum strings. */
/**
 * The backend's failure reasons, by their exact enum names — stored and sent
 * as-is. Labels, grouping and which ones the driver may pick live in
 * `lib/failureReasons`.
 */
export type DeliveryFailureReason =
  | 'ABSENT'
  | 'REFUSED'
  | 'WRONG_ADDRESS'
  | 'INCOMPLETE_ADDRESS'
  | 'PHONE_OFF'
  | 'NO_ANSWER'
  | 'OTHER'
  | 'CANCELLED_BY_CLIENT'
  | 'NOT_INTERESTED_2ND_ATTEMPT'
  | 'WRONG_NUMBER_2ND_ATTEMPT'
  | 'DUPLICATE_ORDER'
  | 'RETURN_CONFIRMED_BY_SENDER'
  | 'NON_COMPLIANT_ORDER'
  | 'INCORRECT_AMOUNT'
  | 'NOT_AVAILABLE_RESCHEDULED'
  | 'UNRELIABLE_CLIENT'
  | 'CALL_REFUSED'
  | 'LINE_BUSY'
  | 'WRONG_PAYMENT_MODE'
  | 'PARCEL_POSTPONED'
  | 'FORCE_MAJEURE';

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
  /**
   * Where the customer is, for nearest-first ordering, distance and the map.
   * Optional: the real server leaves a parcel's coordinates empty unless the
   * agency set them, so every use has an address-only fallback.
   */
  location?: GeoPoint;
  /**
   * The parcel's governorate, standard spelling ("Kasserine"), taken from
   * the server's recipientCity. How "Nearest first" places a parcel that has
   * no coordinates. Absent when the city names none.
   */
  governorate?: string;
  /**
   * Set while "Nearest first" orders the list: how far the driver is from
   * this stop, in km. `distanceApprox` means it was measured to the centre of
   * the parcel's governorate, not to the address.
   */
  distanceKm?: number;
  distanceApprox?: boolean;
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
  /**
   * Set on history parcels: whether a mistake on this one can still be put
   * right. True while its runsheet is open — on the real server, until the
   * agency closes the run (only an IN_PROGRESS run takes updates). Parcels
   * on a closed run are read-only.
   */
  correctable?: boolean;
  /** What the real server says about this parcel beyond the fields above. Absent on mock data. */
  server?: ParcelServerInfo;
}

/**
 * The real server's facts about a parcel, mapped but not (yet) all shown.
 * Kept so later screens — and the write-back endpoints, which need the
 * server's own ids — have them without another request.
 */
export interface ParcelServerInfo {
  /** The parcel's own id on the server. */
  parcelId: string;
  /** The runsheet line this parcel sits on — what status updates will be sent against. */
  itemId?: string;
  runsheetId?: string;
  /**
   * The runsheet's own raw status (PENDING, DRIVER_CONFIRMED, IN_PROGRESS,
   * COMPLETED…). The server only takes parcel updates while it's IN_PROGRESS.
   */
  runsheetStatus?: string;
  /** Position dispatch gave the stop. The driver's own drag order sits on top of it. */
  sequenceOrder?: number;
  /** Raw statuses as the server sent them, including any we don't map yet. */
  itemStatus?: string;
  parcelStatus?: string;
  /** The server's failure reason when it's one we don't know yet. */
  unknownFailureReason?: string;
  /**
   * The cash figures. The customer pays `price` at the door — that's
   * `cashToCollect`. `amountToCollect` (price minus the delivery fee) and
   * `deliveryFee` are kept as data only, never shown as the amount to collect.
   */
  price?: number;
  amountToCollect?: number;
  deliveryFee?: number;
  isPaid?: boolean;
  description?: string;
  parcelType?: string;
  senderName?: string;
  senderPhone?: string;
  senderAgencyName?: string;
  agencyName?: string;
  agencyCity?: string;
  destinationAgencyName?: string;
  destinationAgencyCity?: string;
  companyName?: string;
  driverName?: string;
  lastScanLocation?: string;
  lastScanTime?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  /** Where the delivery was recorded, when the server has it. */
  deliveryLocation?: GeoPoint;
  deliveryPhotoUrl?: string;
  deliverySignatureUrl?: string;
  deliveryAttempts?: number;
  returnType?: string;
}
