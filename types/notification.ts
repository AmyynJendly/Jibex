/** Matches the real backend's uppercase enum strings. */
export type NotificationType = 'PICKUP' | 'DELIVERY' | 'CASH' | 'RETURN' | 'TRANSFER';

export interface Notification {
  /** e.g. "PU-3-20260712-0002" — {TYPE}-{route}-{YYYYMMDD}-{seq}. */
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** ISO 8601; relative labels ("3m", "Yesterday") are derived at render time. */
  timestamp: string;
  read: boolean;
}
