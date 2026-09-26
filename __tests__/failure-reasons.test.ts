/**
 * The failure reasons are the backend's own enum names, sent as-is — a
 * missing label or a retired reason sneaking back into the picker would only
 * show up on a driver's phone. These pin the list down.
 */
import en from '../lib/i18n/en';
import fr from '../lib/i18n/fr';
import {
  COMMON_REASONS,
  FAILURE_REASONS,
  SELECTABLE_REASONS,
  reasonNeedsNote,
} from '../lib/failureReasons';

const BACKEND_NAMES = [
  'ABSENT',
  'REFUSED',
  'WRONG_ADDRESS',
  'INCOMPLETE_ADDRESS',
  'PHONE_OFF',
  'NO_ANSWER',
  'OTHER',
  'CANCELLED_BY_CLIENT',
  'NOT_INTERESTED_2ND_ATTEMPT',
  'WRONG_NUMBER_2ND_ATTEMPT',
  'DUPLICATE_ORDER',
  'RETURN_CONFIRMED_BY_SENDER',
  'NON_COMPLIANT_ORDER',
  'INCORRECT_AMOUNT',
  'NOT_AVAILABLE_RESCHEDULED',
  'UNRELIABLE_CLIENT',
  'CALL_REFUSED',
  'LINE_BUSY',
  'WRONG_PAYMENT_MODE',
  'PARCEL_POSTPONED',
  'FORCE_MAJEURE',
];

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

describe('failure reasons', () => {
  it('are exactly the backend’s 21 names', () => {
    expect(FAILURE_REASONS.map((r) => r.value).sort()).toEqual([...BACKEND_NAMES].sort());
  });

  it('offers the driver 19, without the two the business retired', () => {
    const offered = SELECTABLE_REASONS.map((r) => r.value);
    expect(offered).toHaveLength(19);
    expect(offered).not.toContain('REFUSED');
    expect(offered).not.toContain('NOT_INTERESTED_2ND_ATTEMPT');
  });

  it('keeps the quick list inside what the driver may pick, and without OTHER', () => {
    for (const reason of COMMON_REASONS) {
      expect(reason.selectable).toBe(true);
      expect(reasonNeedsNote(reason.value)).toBe(false);
    }
  });

  it('has an English and a French label for every name, retired ones included', () => {
    for (const name of BACKEND_NAMES) {
      expect(en.enums.failureReason).toHaveProperty(name);
      expect(fr.enums.failureReason).toHaveProperty(name);
    }
  });

  it('refuses OTHER without a note, and accepts it with one', async () => {
    let api!: typeof import('../services/mock-api');
    jest.isolateModules(() => {
      api = require('../services/mock-api');
    });
    const runsheets = await api.getRunsheets();
    const ready = runsheets.find((r) => !r.needsConfirmation && r.status !== 'VALIDE');
    const parcel = (await api.getActiveParcels()).find((p) => ready?.stopIds.includes(p.id));
    if (!parcel) throw new Error('seed data has no open parcel on a confirmed run');

    const bare = await api.markDeliveryFailed(parcel.id, 'OTHER', '   ');
    expect(bare.success).toBe(false);
    expect(bare.error).toBe('cantDeliver.noteRequired');

    const explained = await api.markDeliveryFailed(parcel.id, 'OTHER', 'Gate locked, guard absent');
    expect(explained.success).toBe(true);
    expect(explained.job?.failureReason).toBe('OTHER');
  });
});
