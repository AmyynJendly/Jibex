export type RunsheetStatus = 'in-progress' | 'confirmed' | 'waiting';

export interface Runsheet {
  id: string;
  routeLabel: string;
  zone: string;
  status: RunsheetStatus;
  stopCount: number;
  completionPercent: number;
  /** Job ids belonging to this runsheet, in stop order. */
  stopIds: string[];
}
