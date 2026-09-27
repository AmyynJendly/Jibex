export interface DriverStats {
  delivered: number;
  pending: number;
  failed: number;
  /**
   * Cash on hand: what the driver has collected and not yet handed in.
   *
   * On the real server this is worked out on the phone from delivered
   * parcels, using each parcel's `price` (see `services/real-api.ts`).
   */
  cashCollectedTotal: number;
  completionPercent: number;
  /**
   * e.g. "5:30 PM". Absent when it can't be worked out honestly — the real
   * server gives nothing to estimate a finish time from — and then not shown.
   */
  onPaceFinishTime?: string;
  /** Lifetime delivery count — shown on the Profile summary, distinct from today's `delivered`. */
  lifetimeDeliveries: number;
  /** Share of attempted parcels actually delivered (vs. failed), 0–100 — "taux de livraison". */
  deliveryRate: number;
  /**
   * Cash collected so far this week. Absent — and not shown — on the real
   * server while the cash field itself is unconfirmed.
   */
  weeklyCashCollected?: number;
}
