/**
 * Auto-refresh: in the live test a new runsheet didn't show until the driver
 * went to Home and pulled to refresh. A visible list now reloads when it
 * comes into view and every 60 seconds after.
 */
import { AUTO_REFRESH_MS, autoRefresher } from '../lib/autoRefresh';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('auto-refresh', () => {
  it('reloads as soon as the list comes into view', () => {
    const refresh = jest.fn();
    autoRefresher(refresh).start();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('then reloads every 60 seconds while it stays in view', () => {
    const refresh = jest.fn();
    autoRefresher(refresh).start();
    expect(AUTO_REFRESH_MS).toBe(60_000);

    jest.advanceTimersByTime(59_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(180_000);
    expect(refresh).toHaveBeenCalledTimes(5);
  });

  it('stops when the list leaves the screen', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh);
    refresher.start();
    refresher.stop();
    jest.advanceTimersByTime(300_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('skips the tick while the app is in the background, and picks up again after', () => {
    const refresh = jest.fn();
    let active = true;
    autoRefresher(refresh, { isAppActive: () => active }).start();

    active = false;
    jest.advanceTimersByTime(120_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    active = true;
    jest.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('never runs two timers for one list', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh);
    refresher.start();
    refresher.start();
    jest.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('swallows a failed reload: the screen has its own error state', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('network'));
    const refresher = autoRefresher(refresh);
    expect(() => refresher.start()).not.toThrow();
    await Promise.resolve();
    jest.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    const throwing = autoRefresher(() => {
      throw new Error('boom');
    });
    expect(() => throwing.start()).not.toThrow();
  });
});
