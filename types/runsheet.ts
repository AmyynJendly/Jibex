/**
 * Matches the real backend's uppercase enum strings. A runsheet starts
 * `A_CONFIRMER` (dispatched but the driver hasn't attested to physically
 * receiving its parcels yet — parcel status updates are blocked until they
 * do), moves to `EN_COURS` once receipt is confirmed and stops are
 * deliverable, and finishes `VALIDE` once every stop has been attempted.
 */
export type RunsheetStatus = 'EN_COURS' | 'VALIDE' | 'A_CONFIRMER';

export interface Runsheet {
  id: string;
  /** The server's printed reference, e.g. "RS-20260827-0002". Absent on mock data. */
  code?: string;
  /**
   * Delivery area the parcels fall in. There is deliberately no "route"
   * label: the driver works one flat list of packages and orders it
   * themselves, so grouping them into named routes only added a layer with
   * nothing behind it.
   */
  zone: string;
  /** Depot/branch this runsheet is dispatched from. Single-agency for now — no filtering/grouping by it yet. */
  agency: string;
  status: RunsheetStatus;
  stopCount: number;
  /** Live count of stops with status DELIVERED — recomputed on every read, not stored. */
  deliveredCount: number;
  /**
   * True while the driver still owes dispatch a physical-receipt attestation
   * — either they've never confirmed this runsheet, or its parcel count has
   * changed since they did (a mid-day addition or a missed parcel), which
   * requires re-confirming the new count.
   */
  needsConfirmation: boolean;
  completionPercent: number;
  /** Job ids belonging to this runsheet, in stop order. */
  stopIds: string[];
  /** The vehicle dispatch put on this run, when they filled it in. Absent on mock data. */
  vehiclePlate?: string;
  /**
   * Real server: the driver confirmed receipt, but the run hasn't started
   * (DRIVER_CONFIRMED) — usually because starting failed right after the
   * confirmation. Its parcels stay locked; the card offers "Start run".
   */
  needsStart?: boolean;
  /** Real server: how many parcels dispatch added since the driver signed, waiting for their OK. */
  newParcelsCount?: number;
  /** The server's raw status. Absent on mock data. */
  serverStatus?: string;
}
