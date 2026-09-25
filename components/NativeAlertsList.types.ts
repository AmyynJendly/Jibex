import type { SFSymbol } from 'sf-symbols-typescript';

export interface NativeAlertRow {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  /** Older alerts read a touch quieter, like the rest of the list. */
  dimmed: boolean;
  symbol: SFSymbol;
  color: string;
  soft: string;
  /** Whether tapping it goes somewhere (shows a chevron). */
  opens: boolean;
}

export interface NativeAlertsListProps {
  sections: { key: string; title: string; rows: NativeAlertRow[] }[];
  labels: { delete: string; read: string; unread: string };
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleRead: (id: string, unread: boolean) => void;
  onRefresh: () => Promise<void>;
}
