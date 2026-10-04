import type { Job, NotificationTarget, Pickup, Return, Transfer } from '../types';

/**
 * Search, on the phone only: through the parcels the app has already loaded.
 * The backend asked that search never call the tracking endpoint — a driver
 * can only look up what's theirs, and all of that is already here.
 *
 * Looks in, in this order:
 *   - the current runsheets (parcels still to deliver)
 *   - runsheet history (delivered and failed)
 *   - pickups, and the parcels in each
 *   - transfers (by number, and the tracking numbers they carry)
 *   - returns
 *
 * Matches the tracking number (exact, or a part of it from 3 characters) and
 * the customer's name (from 2 letters, ignoring case and accents). Exact
 * tracking matches come first.
 */

export type SearchSource = 'runsheet' | 'history' | 'pickup' | 'transfer' | 'return';

export interface SearchHit {
  /** Unique within one result list. */
  key: string;
  trackingNumber: string;
  /** Who the parcel is for, when the source says. */
  name?: string;
  source: SearchSource;
  /** Where it sits within that source — the pickup's shop, the transfer's route. */
  context?: string;
  /** The screen that shows it. */
  target: NotificationTarget;
  /** The tracking number matched in full. */
  exact: boolean;
}

/** Whatever has loaded so far; a source that hasn't is simply not searched. */
export interface LoadedParcels {
  active?: Job[] | null;
  history?: Job[] | null;
  pickups?: Pickup[] | null;
  transfers?: Transfer[] | null;
  returns?: Return[] | null;
}

const MIN_PARTIAL_TRACKING = 3;
const MIN_NAME = 2;
const MAX_HITS = 30;

const normalizeTracking = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const normalizeName = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

interface Candidate {
  trackingNumber: string;
  name?: string;
  source: SearchSource;
  context?: string;
  target: NotificationTarget;
}

function candidates(data: LoadedParcels): Candidate[] {
  const out: Candidate[] = [];

  for (const job of data.active ?? []) {
    out.push({
      trackingNumber: job.id,
      name: job.customerName,
      source: 'runsheet',
      target: { screen: 'job', jobId: job.id },
    });
  }
  for (const job of data.history ?? []) {
    out.push({
      trackingNumber: job.id,
      name: job.customerName,
      source: 'history',
      target: { screen: 'runsheets', tab: 'history', focusId: job.id },
    });
  }
  for (const pickup of data.pickups ?? []) {
    const target: NotificationTarget = { screen: 'pickups', tab: pickup.status, focusId: pickup.id };
    for (const parcel of pickup.parcels) {
      out.push({
        trackingNumber: parcel.trackingNumber,
        name: parcel.contactName,
        source: 'pickup',
        context: pickup.businessName,
        target,
      });
    }
  }
  for (const transfer of data.transfers ?? []) {
    const target: NotificationTarget = {
      screen: 'transfers',
      tab: transfer.status === 'COMPLETED' ? 'history' : 'current',
      focusId: transfer.id,
    };
    const context = `${transfer.originAgency} → ${transfer.destinationAgency}`;
    out.push({ trackingNumber: transfer.id, source: 'transfer', context, target });
    for (const tracking of transfer.server?.parcelTrackingNumbers ?? []) {
      out.push({ trackingNumber: tracking, source: 'transfer', context: `${transfer.id} · ${context}`, target });
    }
  }
  for (const item of data.returns ?? []) {
    out.push({
      trackingNumber: item.server?.trackingNumber ?? item.id,
      name: item.server?.senderName,
      source: 'return',
      context: `${item.fromAgency} → ${item.toAgency}`,
      target: { screen: 'returns', tab: item.status === 'PROCESSED' ? 'history' : 'current', focusId: item.id },
    });
  }
  return out;
}

export function searchParcels(query: string, data: LoadedParcels): SearchHit[] {
  const tracking = normalizeTracking(query);
  const name = normalizeName(query);
  if (!tracking) return [];

  const ranked: { hit: SearchHit; rank: number }[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates(data)) {
    const candidateTracking = normalizeTracking(candidate.trackingNumber);
    const exact = candidateTracking === tracking;
    const partial = !exact && tracking.length >= MIN_PARTIAL_TRACKING && candidateTracking.includes(tracking);
    const byName =
      !!candidate.name &&
      name.length >= MIN_NAME &&
      /\p{L}/u.test(name) &&
      normalizeName(candidate.name).includes(name);
    if (!exact && !partial && !byName) continue;

    const key = `${candidate.source}:${candidateTracking}:${candidate.target.screen === 'job' ? '' : (candidate.target.focusId ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push({ hit: { ...candidate, key, exact }, rank: exact ? 0 : partial ? 1 : 2 });
  }

  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_HITS)
    .map(({ hit }) => hit);
}

/** Only the parcels whose tracking number matches exactly — what a scan means. */
export function findExact(code: string, data: LoadedParcels): SearchHit[] {
  return searchParcels(code, data).filter((hit) => hit.exact);
}
