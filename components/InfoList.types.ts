export interface InfoRow {
  label: string;
  value: string;
}

export interface InfoListProps {
  rows: InfoRow[];
  /** Why the driver can't edit these — shown under the list. */
  notice: string;
}
