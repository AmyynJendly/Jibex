/**
 * The scanner counts each code once. In the live test one label, held under
 * the camera, counted "1 package scanned", then 2, 3… with a vibration every
 * second.
 */
import { createScanSession } from '../lib/scanSession';

/** The camera reports a code about every 100 ms while it is in frame. */
function holdInFrame(session: ReturnType<typeof createScanSession>, code: string, from: number, forMs: number) {
  const verdicts: string[] = [];
  for (let t = from; t <= from + forMs; t += 100) verdicts.push(session.read(code, t));
  return verdicts;
}

describe('scan session', () => {
  it('acts on a code the first time it sees it', () => {
    const session = createScanSession();
    expect(session.read('TUN-100-561D8F37', 0)).toBe('process');
  });

  it('ignores the same label for as long as it stays in frame — no loop', () => {
    const session = createScanSession();
    const verdicts = holdInFrame(session, 'TUN-100-561D8F37', 0, 10_000);
    session.count('TUN-100-561D8F37');
    expect(verdicts[0]).toBe('process');
    expect(verdicts.slice(1).every((v) => v === 'ignored')).toBe(true);
    expect(session.size).toBe(1);
  });

  it('says "duplicate" once when a counted label comes back, then stays quiet', () => {
    const session = createScanSession();
    holdInFrame(session, 'A-1', 0, 500);
    session.count('A-1');
    // Taken away for two seconds, then shown again and held.
    const again = holdInFrame(session, 'A-1', 2_500, 3_000);
    expect(again[0]).toBe('duplicate');
    expect(again.slice(1).every((v) => v === 'ignored')).toBe(true);
    expect(session.size).toBe(1);
  });

  it('counts each code once, however many times it is scanned', () => {
    const session = createScanSession();
    for (const at of [0, 5_000, 10_000]) {
      if (session.read('A-1', at) === 'process') session.count('A-1');
    }
    expect(session.size).toBe(1);
  });

  it('locks the camera for another code while the last one is still in frame', () => {
    const session = createScanSession();
    expect(session.read('A-1', 0)).toBe('process');
    // A second label slides into view 300 ms later, the first still visible.
    expect(session.read('A-1', 200)).toBe('ignored');
    expect(session.read('B-2', 300)).toBe('ignored');
  });

  it('accepts another code once the last one has left the frame', () => {
    const session = createScanSession();
    expect(session.read('A-1', 0)).toBe('process');
    // Nothing reported for 800 ms: A-1 is gone.
    expect(session.read('B-2', 800)).toBe('process');
  });

  it('accepts another code after two seconds even if the last one never left', () => {
    const session = createScanSession();
    expect(session.read('A-1', 0)).toBe('process');
    for (let t = 100; t < 2_000; t += 100) session.read('A-1', t);
    expect(session.read('B-2', 1_950)).toBe('ignored');
    session.read('A-1', 2_000);
    expect(session.read('B-2', 2_050)).toBe('process');
  });

  it('retries a code that was not accepted, once it is shown again', () => {
    const session = createScanSession();
    // Read, but the lookup failed: never counted.
    expect(session.read('X-9', 0)).toBe('process');
    expect(session.read('X-9', 100)).toBe('ignored');
    expect(session.read('X-9', 3_000)).toBe('process');
    expect(session.size).toBe(0);
  });

  it('treats a typed code like a scanned one: counted once', () => {
    const session = createScanSession();
    expect(session.enter('trk-5df3697e')).toBe('process');
    session.count('trk-5df3697e');
    expect(session.enter('TRK-5DF3697E')).toBe('duplicate');
    expect(session.has(' TRK-5DF3697E ')).toBe(true);
  });

  it('ignores an empty read', () => {
    expect(createScanSession().read('   ', 0)).toBe('ignored');
  });
});
