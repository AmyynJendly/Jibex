import type { GeoPoint } from '../types';
import { i18next } from './i18n';

/**
 * Proof for a failed delivery, as one short line for the agency.
 *
 * The server's status update has no field for the call log or for where
 * the driver stood, but it does take free-text `notes`. So the app adds one
 * line there — "Client appelé 3 fois (10:02, 10:15, 10:31). Position : 36.80012,
 * 10.18045." — after the driver's own note.
 *
 * Always in French, whatever language the driver's app is in: the line is
 * read by the agency, not by the driver, and the agency works in French. In
 * the live test an English app sent "Not called. Location: …" to a French
 * back office.
 */
const agencyText = i18next.getFixedT('fr');

/** Only the latest calls are listed; older ones are counted. */
const MAX_TIMES = 5;

const pad = (n: number) => String(n).padStart(2, '0');

/** "10:02" today, "26/09 10:02" on another day. 24-hour, as agencies in Tunisia read it. */
function callTime(iso: string, now: Date): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toDateString() === now.toDateString() ? time : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${time}`;
}

export function failureProofLine({
  calls,
  unreachable = false,
  location,
  now = new Date(),
}: {
  calls: readonly string[];
  /** The driver noted "client injoignable" after calling. */
  unreachable?: boolean;
  location?: GeoPoint | null;
  now?: Date;
}): string {
  const t = agencyText;
  const times = calls.map((iso) => callTime(iso, now)).filter((time): time is string => !!time);
  const shown = times.slice(-MAX_TIMES).join(', ');
  const listed = times.length > MAX_TIMES ? `…, ${shown}` : shown;

  const parts = [
    times.length === 0 ? t('failureProof.notCalled') : t('failureProof.called', { count: times.length, times: listed }),
  ];
  if (unreachable && times.length > 0) parts.push(t('failureProof.unreachable'));
  if (location) {
    // Five decimals ≈ one metre: enough to show which door, no more. (Not
    // `lng` as a parameter name: i18next reads that as a language.)
    parts.push(
      t('failureProof.location', { latitude: location.lat.toFixed(5), longitude: location.lng.toFixed(5) })
    );
  }
  return parts.join(' ');
}

/** The notes sent with a failure: the driver's own note first, then the proof line. */
export function failureNotes(driverNote: string | undefined, proofLine: string): string {
  return [driverNote?.trim(), proofLine].filter(Boolean).join('\n');
}
