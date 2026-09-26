import type { TFunction } from 'i18next';

import type { WriteResult } from '../types';

/** The message for a failed action, in the app's language — with the server's reason when it gave one. */
export function writeErrorText(t: TFunction, result: Pick<WriteResult, 'error' | 'errorParams'>): string {
  return t(result.error ?? 'common.genericError', result.errorParams ?? {});
}

/**
 * Runs an action and turns anything it throws into a failed result, so a
 * screen never crashes on a write — it gets a message to show instead.
 */
export async function safely<T extends WriteResult>(action: () => Promise<T>): Promise<T | WriteResult> {
  try {
    return await action();
  } catch {
    return { success: false, error: 'common.genericError' };
  }
}
