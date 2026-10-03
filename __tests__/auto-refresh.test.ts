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

/**
 * Polling cost: in the background the timer itself must stop, not only skip
 * its work — a timer firing every minute still wakes the app.
 */
describe('auto-refresh in the background', () => {
  it('has no timer at all while paused, and none is left behind', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh);
    refresher.start();
    expect(refresher.ticking).toBe(true);
    expect(jest.getTimerCount()).toBe(1);

    refresher.pause();
    expect(refresher.ticking).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(600_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('starts ticking again on return, without a second reload of its own', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh);
    refresher.start();
    refresher.pause();
    refresher.resume();
    // The reload on return is done once, by the app-wide foreground refresh.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not restart for a list that left the screen while the app was away', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh);
    refresher.start();
    refresher.pause();
    refresher.stop();
    refresher.resume();
    expect(refresher.ticking).toBe(false);
    jest.advanceTimersByTime(300_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not start a timer for a list opened while the app is not active', () => {
    const refresh = jest.fn();
    const refresher = autoRefresher(refresh, { isAppActive: () => false });
    refresher.start();
    expect(refresher.ticking).toBe(false);
    refresher.resume();
    expect(refresher.ticking).toBe(true);
  });

  it('never runs two timers after several returns to the foreground', () => {
    const refresher = autoRefresher(jest.fn());
    refresher.start();
    refresher.resume();
    refresher.resume();
    expect(jest.getTimerCount()).toBe(1);
  });
});
