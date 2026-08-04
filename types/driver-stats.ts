export interface DriverStats {
  delivered: number;
  pending: number;
  failed: number;
  pickupsCount: number;
  cashCollectedTotal: number;
  completionPercent: number;
  /** e.g. "5:30 PM". */
  onPaceFinishTime: string;
}
