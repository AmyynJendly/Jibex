/**
 * The counts on Home's four buttons, like the badges on the Android
 * dashboard: the driver sees what is waiting without opening each screen.
 */
import { badgeText, homeBadges } from '../lib/homeBadges';
import type { Pickup, Return, Runsheet, Transfer } from '../types';

const run = (status: Runsheet['status']) => ({ status }) as Runsheet;
const pickup = (status: Pickup['status']) => ({ status }) as Pickup;
const transfer = (status: Transfer['status'], awaitingPickupConfirmation = false) =>
  ({ status, awaitingPickupConfirmation }) as Transfer;
const ret = (status: Return['status']) => ({ status }) as Return;

describe('home badges', () => {
  it('counts what is still waiting behind each button', () => {
    expect(
      homeBadges({
        runsheets: [run('A_CONFIRMER'), run('EN_COURS'), run('VALIDE')],
        pickups: [pickup('SCHEDULED'), pickup('COMPLETED'), pickup('COMPLETED')],
        // One to load, one already on the road: both are open transfers.
        transfers: [transfer('IN_PROGRESS', true), transfer('IN_PROGRESS'), transfer('COMPLETED')],
        returns: [ret('PENDING_PICKUP'), ret('PROCESSED')],
      })
    ).toEqual({ runsheets: 2, pickups: 1, transfers: 2, returns: 1 });
  });

  it('matches the live screenshots: one open transfer, nothing else', () => {
    const pickups = Array.from({ length: 6 }, () => pickup('COMPLETED'));
    expect(homeBadges({ runsheets: [], pickups, transfers: [transfer('IN_PROGRESS')], returns: [] })).toEqual({
      runsheets: 0,
      pickups: 0,
      transfers: 1,
      returns: 0,
    });
  });

  it('shows no badge while a list has not loaded, or failed to', () => {
    expect(homeBadges({})).toEqual({ runsheets: 0, pickups: 0, transfers: 0, returns: 0 });
    expect(homeBadges({ runsheets: null, pickups: undefined, transfers: null, returns: null })).toEqual({
      runsheets: 0,
      pickups: 0,
      transfers: 0,
      returns: 0,
    });
  });

  it('prints nothing at zero and caps at 99+', () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-1)).toBeNull();
    expect(badgeText(NaN)).toBeNull();
    expect(badgeText(1)).toBe('1');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(500)).toBe('99+');
  });
});
