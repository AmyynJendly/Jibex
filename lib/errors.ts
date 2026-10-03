/**
 * Telling "no connection" apart from every other failure.
 *
 * The API layer throws an `ApiError` with status 0 when a request never got
 * an answer (no network, a timeout, the server unreachable). Screens that
 * call the API directly must catch it: in the live test one that didn't
 * showed a raw "Uncaught (in promise) ApiError: network" instead of telling
 * the driver to try again.
 *
 * Checked by shape rather than by class, so this file stays free of the API
 * layer (and works the same on mock data, which never throws it).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, status } = error as { name?: unknown; status?: unknown };
  return name === 'ApiError' && status === 0;
}

/** The request left the phone but the server did not answer in time. It may still have received it. */
export function isTimeoutError(error: unknown): boolean {
  return isNetworkError(error) && (error as { message?: unknown }).message === 'timeout';
}

/** The i18n key to show for something a direct API call threw. */
export function errorKeyOf(error: unknown): 'common.networkError' | 'common.slowConnection' | 'common.genericError' {
  if (isTimeoutError(error)) return 'common.slowConnection';
  return isNetworkError(error) ? 'common.networkError' : 'common.genericError';
}
