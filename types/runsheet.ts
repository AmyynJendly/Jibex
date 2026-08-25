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
}
