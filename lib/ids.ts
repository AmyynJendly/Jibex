import { toCompactDateKey } from './date';

/** "TRK-" + 8 uppercase hex chars — real backend parcel/tracking ID format. */
export function generateTrackingId(): string {
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16))
    .join('')
    .toUpperCase();
  return `TRK-${hex}`;
}

/** "RS-" + YYYYMMDD + 4-digit daily sequence — real backend runsheet ID format. */
export function formatRunsheetId(date: Date, dailySequence: number): string {
  return `RS-${toCompactDateKey(date)}-${String(dailySequence).padStart(4, '0')}`;
}

/** "PU-" + route + YYYYMMDD + 4-digit daily sequence — real backend pickup ID format, e.g. "PU-3-20260712-0002". */
export function formatPickupId(route: string, date: Date, dailySequence: number): string {
  return `PU-${route}-${toCompactDateKey(date)}-${String(dailySequence).padStart(4, '0')}`;
}
