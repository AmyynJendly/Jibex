export const AVAILABILITY_BLOCKS = ['morning', 'afternoon', 'evening'] as const;
export type AvailabilityBlock = (typeof AVAILABILITY_BLOCKS)[number];

/** Which blocks the driver has marked themselves available for on a given day. */
export type DayAvailability = Record<AvailabilityBlock, boolean>;

/** Availability keyed by local calendar date (`YYYY-MM-DD`, see `lib/date.ts`), not weekday — a driver marks specific dates, not a recurring weekly pattern. */
export type Availability = Record<string, DayAvailability>;
