/**
 * One scanning session: decides what to do each time the camera reports a
 * code.
 *
 * A camera reports the code in front of it many times a second, for as long
 * as it stays in frame. Without these rules, one label held under the phone
 * counts again and again, with a vibration each time:
 *
 *  - A code that is still in frame is ignored, silently, however long it
 *    stays there. It only counts again once it has left the frame.
 *  - After a scan the camera is locked for other codes too, until that code
 *    leaves the frame or two seconds pass — so two labels side by side don't
 *    both fire at once.
 *  - Each code counts once per session. Shown again later, it is a
 *    "duplicate": the screen says "Déjà scanné" once, with no vibration.
 *
 * Kept free of React so the timing can be tested.
 */
export type ScanVerdict =
  /** A code to act on. */
  | 'process'
  /** Already counted this session: say so, don't act. */
  | 'duplicate'
  /** Still the code in frame, or the camera is locked: do nothing at all. */
  | 'ignored';

/** How long after a scan the camera refuses other codes, at most. */
const SCAN_LOCK_MS = 2_000;
/** No report of the code for this long means it has left the frame. */
const LEFT_FRAME_MS = 700;

/** Codes are compared without spaces and case, as printed labels and typed codes differ. */
export const normalizeCode = (code: string) => code.replace(/\s+/g, '').toUpperCase();

export interface ScanSession {
  /** The camera reported this code. */
  read: (code: string, now?: number) => ScanVerdict;
  /** A code typed by hand: no frame, no lock — only "already counted?". */
  enter: (code: string) => 'process' | 'duplicate';
  /** The code was accepted: it counts, once. */
  count: (code: string) => void;
  has: (code: string) => boolean;
  /** How many distinct codes were counted. */
  readonly size: number;
}

export function createScanSession({
  lockMs = SCAN_LOCK_MS,
  leftFrameMs = LEFT_FRAME_MS,
}: { lockMs?: number; leftFrameMs?: number } = {}): ScanSession {
  const counted = new Set<string>();
  /** The last code acted on (or reported as a duplicate), and when it was last seen. */
  let last: { code: string; at: number; seenAt: number } | null = null;

  return {
    read(code, now = Date.now()) {
      const key = normalizeCode(code);
      if (!key) return 'ignored';

      if (last) {
        const stillInFrame = now - last.seenAt < leftFrameMs;
        if (key === last.code) {
          if (stillInFrame) {
            last.seenAt = now;
            return 'ignored';
          }
        } else if (stillInFrame && now - last.at < lockMs) {
          return 'ignored';
        }
      }

      last = { code: key, at: now, seenAt: now };
      return counted.has(key) ? 'duplicate' : 'process';
    },
    enter(code) {
      return counted.has(normalizeCode(code)) ? 'duplicate' : 'process';
    },
    count(code) {
      const key = normalizeCode(code);
      if (key) counted.add(key);
    },
    has(code) {
      return counted.has(normalizeCode(code));
    },
    get size() {
      return counted.size;
    },
  };
}
