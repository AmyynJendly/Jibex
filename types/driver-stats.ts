export interface DriverStats {
  delivered: number;
  pending: number;
  failed: number;
  pickupsCount: number;
  cashCollectedTotal: number;
  completionPercent: number;
  /** e.g. "5:30 PM". */
  onPaceFinishTime: string;
  /** Lifetime delivery count — shown on the Profile summary, distinct from today's `delivered`. */
  lifetimeDeliveries: number;
  /** Share of assigned parcels actually delivered (vs. failed/returned), 0–100 — "taux de livraison". */
  deliveryRate: number;
  /** Cash collected so far this week. */
  weeklyCashCollected: number;
}
