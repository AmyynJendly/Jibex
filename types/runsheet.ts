/** Matches the real backend's uppercase enum strings. */
export type RunsheetStatus = 'IN_PROGRESS' | 'CONFIRMED' | 'WAITING';

export interface Runsheet {
  id: string;
  routeLabel: string;
  zone: string;
  /** Depot/branch this runsheet is dispatched from. Single-agency for now — no filtering/grouping by it yet. */
  agency: string;
  status: RunsheetStatus;
  stopCount: number;
  completionPercent: number;
  /** Job ids belonging to this runsheet, in stop order. */
  stopIds: string[];
}
