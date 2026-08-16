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
  /** Lifetime on-time delivery rate, 0–100. */
  onTimeRate: number;
  /** Cash collected so far this week. */
  weeklyCashCollected: number;
}
