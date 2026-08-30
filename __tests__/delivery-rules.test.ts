/**
 * The rules that protect money and proof-of-delivery.
 *
 * These live in `mock-api` today and will move behind a real backend later,
 * but the rules themselves are the product: a delivery needs a call attempt
 * first, undoing one has to give the cash back, and a run isn't finished
 * until its last parcel is. Nothing here touches a screen — it's the logic
 * that a UI change must not be able to break silently.
 *
 * `mock-api` holds its state at module scope, so every test re-imports it
 * fresh rather than inheriting whatever the previous test left behind.
 */

type Api = typeof import('../services/mock-api');

/** A fresh copy of the API with untouched seed data. */
function freshApi(): Api {
  let api!: Api;
  jest.isolateModules(() => {
    api = require('../services/mock-api');
  });
  return api;
}

/** A parcel on a run the driver has already signed for, so only the call gate is left. */
async function workableParcel(api: Api) {
  const runsheets = await api.getRunsheets();
  const ready = runsheets.find((r) => !r.needsConfirmation && r.status !== 'VALIDE');
  if (!ready) throw new Error('seed data has no confirmed, unfinished run');

  const parcels = await api.getActiveParcels();
  const parcel = parcels.find((p) => ready.stopIds.includes(p.id));
  if (!parcel) throw new Error('seed data has no open parcel on a confirmed run');
  return parcel;
}

describe('the doorstep Delivered button', () => {
  it('refuses when the driver never called, same as the OTP and photo routes', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);

    const result = await api.confirmDelivery(parcel.id, parcel.cashToCollect);

    expect(result.success).toBe(false);
    expect(result.error).toBe('statusUpdate.callRequired');
  });

  it('marks the parcel delivered and banks the cash once the call is logged', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);
    const before = (await api.getDriverStats()).cashCollectedTotal;

    await api.logCallAttempt(parcel.id);
    const result = await api.confirmDelivery(parcel.id, parcel.cashToCollect);

    expect(result.success).toBe(true);
    expect(result.job?.status).toBe('DELIVERED');
    expect((await api.getDriverStats()).cashCollectedTotal).toBe(before + parcel.cashToCollect);
  });

  it('still refuses on a run the driver has not signed for', async () => {
    const api = freshApi();
    const runsheets = await api.getRunsheets();
    const unsigned = runsheets.find((r) => r.needsConfirmation);
    if (!unsigned) throw new Error('seed data has no unconfirmed run');
    const parcel = (await api.getActiveParcels()).find((p) => unsigned.stopIds.includes(p.id));
    if (!parcel) throw new Error('seed data has no parcel on an unconfirmed run');

    await api.logCallAttempt(parcel.id);
    const result = await api.confirmDelivery(parcel.id, parcel.cashToCollect);

    expect(result.success).toBe(false);
    expect(result.error).toBe('runsheets.confirm.blockedError');
  });
});

describe('a failure reason can carry the driver\'s location', () => {
  it('attaches the fix passed at the moment the reason was logged', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);
    const fix = { lat: 35.848, lng: 10.5975 };

    const result = await api.markDeliveryFailed(parcel.id, 'CUSTOMER_ABSENT', undefined, fix);

    expect(result.success).toBe(true);
    expect(result.job?.failureLocation).toEqual(fix);
  });

  it('is optional — a denied permission logs the failure with no location', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);

    const result = await api.markDeliveryFailed(parcel.id, 'CUSTOMER_ABSENT');

    expect(result.success).toBe(true);
    expect(result.job?.failureLocation).toBeUndefined();
  });

  it('is cleared when the failure is reopened, along with the reason', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);
    const fix = { lat: 35.848, lng: 10.5975 };

    await api.markDeliveryFailed(parcel.id, 'CUSTOMER_ABSENT', undefined, fix);
    const reopened = await api.reopenParcel(parcel.id);

    expect(reopened.failureLocation).toBeUndefined();
    expect(reopened.failureReason).toBeUndefined();
  });
});

describe('notifications can be cleared', () => {
  it('deletes one without touching the rest', async () => {
    const api = freshApi();
    const before = await api.getNotifications();
    expect(before.length).toBeGreaterThan(1);

    await api.deleteNotification(before[0].id);
    const after = await api.getNotifications();

    expect(after).toHaveLength(before.length - 1);
    expect(after.find((n) => n.id === before[0].id)).toBeUndefined();
  });

  it('empties the list', async () => {
    const api = freshApi();
    expect((await api.getNotifications()).length).toBeGreaterThan(0);

    await api.deleteAllNotifications();

    expect(await api.getNotifications()).toHaveLength(0);
  });
});

describe('a delivery needs a call attempt first', () => {
  it('refuses an OTP delivery when the driver never called', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);
    expect(parcel.callAttempts).toBe(0);

    const result = await api.confirmDeliveryWithOTP(parcel.id, '4187', parcel.cashToCollect);

    expect(result.success).toBe(false);
    expect(result.error).toBe('statusUpdate.callRequired');
  });

  it('refuses a photo delivery when the driver never called', async () => {
    // The case that shipped broken: the photo screen ignored this rejection
    // entirely, so Confirm did nothing at all and said nothing about why.
    const api = freshApi();
    const parcel = await workableParcel(api);

    const result = await api.confirmDeliveryWithPhoto(parcel.id, 'file://proof.jpg', parcel.cashToCollect);

    expect(result.success).toBe(false);
    expect(result.error).toBe('statusUpdate.callRequired');
  });

  it('allows the delivery once a call is logged', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);

    const called = await api.logCallAttempt(parcel.id);
    expect(called.callAttempts).toBe(1);
    expect(called.lastCallAt).toBeTruthy();

    const result = await api.confirmDeliveryWithPhoto(parcel.id, 'file://proof.jpg', parcel.cashToCollect);
    expect(result.success).toBe(true);
  });
});

describe('parcels on an unconfirmed run are locked', () => {
  it('refuses a delivery until the driver signs for the run', async () => {
    const api = freshApi();
    const runsheets = await api.getRunsheets();
    const unsigned = runsheets.find((r) => r.needsConfirmation && r.status !== 'VALIDE');
    if (!unsigned) throw new Error('seed data has no run awaiting confirmation');

    const parcelId = unsigned.stopIds[0];
    await api.logCallAttempt(parcelId);

    const blocked = await api.confirmDeliveryWithPhoto(parcelId, 'file://proof.jpg', 0);
    expect(blocked.success).toBe(false);
    expect(blocked.error).toBe('runsheets.confirm.blockedError');

    await api.confirmRunsheetReceipt(unsigned.id);

    const allowed = await api.confirmDeliveryWithPhoto(parcelId, 'file://proof.jpg', 0);
    expect(allowed.success).toBe(true);
  });
});

describe('undoing a delivery gives the money back', () => {
  it('restores the cash total and the delivered count', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);
    const before = await api.getDriverStats();

    await api.logCallAttempt(parcel.id);
    const delivered = await api.confirmDeliveryWithOTP(parcel.id, '4187', parcel.cashToCollect);
    // OTP may not match this particular parcel; fall back to the photo path,
    // which is the same completion underneath.
    if (!delivered.success) {
      const viaPhoto = await api.confirmDeliveryWithPhoto(
        parcel.id,
        'file://proof.jpg',
        parcel.cashToCollect
      );
      expect(viaPhoto.success).toBe(true);
    }

    const after = await api.getDriverStats();
    expect(after.cashCollectedTotal).toBeCloseTo(before.cashCollectedTotal + parcel.cashToCollect, 3);
    expect(after.delivered).toBe(before.delivered + 1);

    await api.reopenParcel(parcel.id);

    const undone = await api.getDriverStats();
    expect(undone.cashCollectedTotal).toBeCloseTo(before.cashCollectedTotal, 3);
    expect(undone.delivered).toBe(before.delivered);
  });

  it('puts the parcel back in the active list and out of history', async () => {
    const api = freshApi();
    const parcel = await workableParcel(api);

    await api.logCallAttempt(parcel.id);
    await api.confirmDeliveryWithPhoto(parcel.id, 'file://proof.jpg', parcel.cashToCollect);

    expect((await api.getActiveParcels()).map((p) => p.id)).not.toContain(parcel.id);
    expect((await api.getHistoryParcels()).map((p) => p.id)).toContain(parcel.id);

    await api.reopenParcel(parcel.id);

    expect((await api.getActiveParcels()).map((p) => p.id)).toContain(parcel.id);
    expect((await api.getHistoryParcels()).map((p) => p.id)).not.toContain(parcel.id);
  });
});

describe('a run finishes when its last parcel is done', () => {
  it('stays open while parcels remain, and closes on the last one', async () => {
    const api = freshApi();
    const runsheets = await api.getRunsheets();
    const run = runsheets.find((r) => !r.needsConfirmation && r.status === 'EN_COURS');
    if (!run) throw new Error('seed data has no confirmed run in progress');

    const active = await api.getActiveParcels();
    const open = active.filter((p) => run.stopIds.includes(p.id));
    expect(open.length).toBeGreaterThan(0);

    for (const [index, parcel] of open.entries()) {
      await api.logCallAttempt(parcel.id);
      await api.confirmDeliveryWithPhoto(parcel.id, 'file://proof.jpg', parcel.cashToCollect);

      const state = (await api.getRunsheets()).find((r) => r.id === run.id);
      const isLast = index === open.length - 1;
      expect(state?.status).toBe(isLast ? 'VALIDE' : 'EN_COURS');
    }
  });
});

describe('re-confirmation when the count changes', () => {
  it('asks again once dispatch has changed what the driver is carrying', async () => {
    const api = freshApi();
    const runsheets = await api.getRunsheets();
    // Seeded mid-day: signed for four, holding five.
    const recount = runsheets.find(
      (r) => r.needsConfirmation && r.status === 'EN_COURS'
    );
    if (!recount) throw new Error('seed data has no run needing a recount');

    expect(recount.needsConfirmation).toBe(true);

    await api.confirmRunsheetReceipt(recount.id);

    const after = (await api.getRunsheets()).find((r) => r.id === recount.id);
    expect(after?.needsConfirmation).toBe(false);
  });
});
