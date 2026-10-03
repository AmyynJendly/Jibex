import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The last few errors a screen crashed on, kept on the phone.
 *
 * There is no crash-reporting service behind this app, so when a driver says
 * "the screen broke" there was nothing to look at. Each crash caught by the
 * screen error boundary is saved here: when, on which screen, and the error's
 * name and message. Nothing about the driver or a customer is written — only
 * the error itself, cut short.
 */
const KEY = 'jibex.device.errorLog.v1';
export const ERROR_LOG_SIZE = 20;
const MAX_TEXT = 300;

export interface LoggedError {
  /** ISO time. */
  at: string;
  /** The route the error was caught on, e.g. "/pickups". */
  where: string;
  name: string;
  message: string;
  /** The first lines of the stack, when there is one. */
  stack?: string;
}

const cut = (text: string, max = MAX_TEXT) => (text.length > max ? text.slice(0, max) + '…' : text);

export function describeError(error: unknown, where: string, now: Date = new Date()): LoggedError {
  const known = error instanceof Error ? error : null;
  return {
    at: now.toISOString(),
    where,
    name: known?.name ?? typeof error,
    message: cut(known?.message ?? String(error)),
    stack: known?.stack ? cut(known.stack.split('\n').slice(0, 6).join('\n'), 800) : undefined,
  };
}

export async function readErrorLog(): Promise<LoggedError[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LoggedError[]) : [];
  } catch {
    return [];
  }
}

/** Saves the error, newest first, keeping the last 20. Never throws: logging must not crash the crash screen. */
export async function logError(error: unknown, where: string): Promise<void> {
  try {
    const entries = [describeError(error, where), ...(await readErrorLog())].slice(0, ERROR_LOG_SIZE);
    await AsyncStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable: the screen still shows its message and its retry.
  }
}

export async function clearErrorLog(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
