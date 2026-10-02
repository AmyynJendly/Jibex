/**
 * Checking a pickup's or a transfer's parcels before signing for them.
 *
 * In the live tests one tap completed a pickup and one tap put five parcels
 * "in transit", with no scan and no count. The check is done on the phone:
 * the button stays disabled until every listed parcel is scanned or ticked.
 */
import {
  checkAll,
  checkProgress,
  checkScan,
  checkedOf,
  checklistKey,
  clearChecklist,
  setChecked,
  subscribeChecklists,
} from '../lib/checklist';

const PARCELS = ['TUN-100-51B62DC7', 'TUN-100-699F0F1D', 'TUN-100-C9166BCA', 'TUN-100-6107B96B', 'TUN-100-561D8F37'];

let n = 0;
/** A fresh list each test: the store lives for the app's lifetime. */
const freshKey = () => checklistKey.transfer(`T${++n}`);

describe('checklist', () => {
  it('starts with nothing checked, and the button disabled', () => {
    const key = freshKey();
    expect(checkProgress(PARCELS, checkedOf(key))).toMatchObject({ done: 0, total: 5, complete: false });
  });

  it('counts "4/5 colis" and names what is missing', () => {
    const key = freshKey();
    for (const code of PARCELS.slice(0, 4)) expect(checkScan(key, PARCELS, code)).toBe('checked');
    const progress = checkProgress(PARCELS, checkedOf(key));
    expect(progress).toMatchObject({ done: 4, total: 5, complete: false });
    expect(progress.missing).toEqual(['TUN-100-561D8F37']);
  });

  it('is complete only when every parcel is scanned', () => {
    const key = freshKey();
    for (const code of PARCELS) checkScan(key, PARCELS, code);
    expect(checkProgress(PARCELS, checkedOf(key))).toMatchObject({ done: 5, total: 5, complete: true, missing: [] });
  });

  it('refuses a parcel that is not in the list', () => {
    const key = freshKey();
    expect(checkScan(key, PARCELS, 'TRK-NOT-MINE')).toBe('unknown');
    expect(checkProgress(PARCELS, checkedOf(key)).done).toBe(0);
  });

  it('counts a parcel once, however often it is scanned', () => {
    const key = freshKey();
    expect(checkScan(key, PARCELS, PARCELS[0])).toBe('checked');
    expect(checkScan(key, PARCELS, PARCELS[0])).toBe('already');
    expect(checkScan(key, PARCELS, ` ${PARCELS[0].toLowerCase()} `)).toBe('already');
    expect(checkProgress(PARCELS, checkedOf(key)).done).toBe(1);
  });

  it('lets a pickup parcel be ticked and unticked by hand', () => {
    const key = checklistKey.pickup(`P${++n}`);
    setChecked(key, 'TRK-AAAA0001', true);
    expect(checkProgress(['TRK-AAAA0001', 'TRK-AAAA0002'], checkedOf(key)).done).toBe(1);
    setChecked(key, 'TRK-AAAA0001', false);
    expect(checkProgress(['TRK-AAAA0001', 'TRK-AAAA0002'], checkedOf(key)).done).toBe(0);
  });

  it('ticks everything at once for a big pickup, and clears', () => {
    const key = checklistKey.pickup(`P${++n}`);
    const many = Array.from({ length: 1000 }, (_, i) => `TRK-${String(i).padStart(8, '0')}`);
    checkAll(key, many);
    expect(checkProgress(many, checkedOf(key))).toMatchObject({ done: 1000, total: 1000, complete: true });
    clearChecklist(key);
    expect(checkProgress(many, checkedOf(key)).done).toBe(0);
  });

  it('is never "complete" with no parcels listed: there is nothing to check', () => {
    expect(checkProgress([], checkedOf(freshKey()))).toMatchObject({ done: 0, total: 0, complete: false });
  });

  it('keeps each pickup and transfer separate', () => {
    const a = freshKey();
    const b = freshKey();
    checkScan(a, PARCELS, PARCELS[0]);
    expect(checkedOf(b).size).toBe(0);
  });

  it('tells the screen when something changes — the scanner and the list share it', () => {
    const key = freshKey();
    const listener = jest.fn();
    const unsubscribe = subscribeChecklists(listener);
    const before = checkedOf(key);
    checkScan(key, PARCELS, PARCELS[0]);
    expect(listener).toHaveBeenCalledTimes(1);
    // A new object, so a store hook sees the change.
    expect(checkedOf(key)).not.toBe(before);
    // Nothing changed: nobody is woken up.
    checkScan(key, PARCELS, PARCELS[0]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    checkScan(key, PARCELS, PARCELS[1]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
