/**
 * What every action that changes data answers with — on mock data and on the
 * real server alike. Actions never throw: a failure comes back as a result,
 * so a screen can show why and leave everything as it was.
 */
export interface WriteResult {
  success: boolean;
  /** An i18n key saying why it failed, e.g. `common.writesOff`. */
  error?: string;
  /** Values for that message, e.g. the server's own reason. */
  errorParams?: Record<string, string>;
}

/**
 * An action run on several items at once (Done on pickups, Confirm on
 * returns). Each item succeeds or fails on its own, so the screen can say
 * "3 of 4 done" rather than pretending all or nothing happened.
 */
export interface BatchWriteResult extends WriteResult {
  succeeded: string[];
  failed: string[];
}
