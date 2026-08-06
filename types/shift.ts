export interface ShiftStatus {
  isActive: boolean;
  /** ISO timestamp the current shift started, or null when off-shift. */
  startedAt: string | null;
}

export interface ShiftSummary {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  delivered: number;
  failed: number;
  distanceMiles: number;
  cashCollected: number;
}
