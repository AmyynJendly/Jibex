/** Matches the real backend's uppercase enum strings. */
export type NotificationType = 'PICKUP' | 'DELIVERY' | 'CASH' | 'RETURN' | 'TRANSFER';

/**
 * Where tapping a notification takes the driver.
 *
 * Kept as a small union rather than a raw route string so the alert list
 * can't link somewhere that doesn't exist — adding a screen means adding a
 * case here, and the compiler finds every place that has to handle it.
 */
export type NotificationTarget =
  /** A single parcel — opens its stop screen directly. */
  | { screen: 'job'; jobId: string }
  | { screen: 'runsheets'; tab: 'current' | 'history'; focusId?: string }
  | { screen: 'pickups'; tab: 'SCHEDULED' | 'COMPLETED'; focusId?: string }
  | { screen: 'transfers'; tab: 'current' | 'history'; focusId?: string }
  | { screen: 'returns'; tab: 'current' | 'history'; focusId?: string };

export interface Notification {
  /** e.g. "PU-3-20260712-0002" — {TYPE}-{route}-{YYYYMMDD}-{seq}. */
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** ISO 8601; relative labels ("3m", "Yesterday") are derived at render time. */
  timestamp: string;
  read: boolean;
  /** Omitted when the alert is purely informational and has nowhere to go. */
  target?: NotificationTarget;
}
