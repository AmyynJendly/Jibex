/**
 * The checks before a new password is sent — the same ones as the Android
 * app: the two new entries match, and at least four characters. Returns the
 * i18n key of what is wrong, or null when it can be sent.
 */
export const MIN_PASSWORD_LENGTH = 4;

export type PasswordProblem =
  | 'changePassword.errors.oldRequired'
  | 'changePassword.errors.tooShort'
  | 'changePassword.errors.mismatch'
  | 'changePassword.errors.same';

export function passwordProblem(entry: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): PasswordProblem | null {
  if (!entry.oldPassword) return 'changePassword.errors.oldRequired';
  if (entry.newPassword !== entry.confirmPassword) return 'changePassword.errors.mismatch';
  if (entry.newPassword.length < MIN_PASSWORD_LENGTH) return 'changePassword.errors.tooShort';
  if (entry.newPassword === entry.oldPassword) return 'changePassword.errors.same';
  return null;
}
