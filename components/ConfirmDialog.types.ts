export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Can't be undone — shown in the platform's destructive style. */
  destructive?: boolean;
}

export interface ConfirmDialogViewProps {
  /** The dialog is shown whenever this is non-null. */
  options: ConfirmOptions | null;
  onResolve: (confirmed: boolean) => void;
}
