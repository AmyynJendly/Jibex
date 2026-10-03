/**
 * Writes on the real server.
 *
 * With `EXPO_PUBLIC_API_WRITES` off (the default), real mode must never show
 * a fake success: every action that would change server data is refused on
 * the phone, sends nothing, and never falls through to the mock. Nothing
 * here talks to jibex.cloud — `fetch` is a stand-in server.
 *
 * With writes ON, each action must send exactly what the backend expects,
 * in the right order, by the right id — and report success only once the
 * server has said yes.
 */

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

type Api = typeof import('../services/api');

const USER_ID = 7;
const DRIVER_ID = 31;

let fetchMock: jest.Mock;
let calls: { url: string; method: string; body?: string }[];

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

const NOTIFICATIONS = [
  { id: 900, title: 'Colis livré', message: 'TRK-1', type: 'PARCEL_DELIVERED', isRead: true, createdAt: '2026-09-26T08:00:00' },
  { id: 901, title: 'Nouvelle collecte', message: 'Boutique', type: 'PICKUP_ASSIGNED', isRead: false, createdAt: '2026-09-26T09:00:00' },
];

/**
 * The app's own switch file (`services/api`) in REAL mode, writes as given,
 * signed in against the stand-in server.
 */
async function realApp({ writes }: { writes: boolean }): Promise<Api> {
  let api!: Api;
  jest.isolateModules(() => {
    jest.doMock('../constants/backend', () => ({
      ...jest.requireActual('../constants/backend'),
      API_MODE: 'real',
      API_WRITES: writes,
    }));
    api = require('../services/api');
  });
  fetchMock.mockImplementation((url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body as string | undefined });
    if (url.endsWith('/api/auth/login')) {
      return json(200, {
        token: 't',
        role: 'DRIVER',
        user: { id: USER_ID, driverId: DRIVER_ID, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true },
      });
    }
    if (url.includes('/api/notifications/user/')) return json(200, NOTIFICATIONS);
    if (url.includes('/api/runsheets/driver/')) return json(200, []);
    if (url.includes('/api/runsheets?driverId=')) return json(200, []);
    return json(404, { error: 'not found' });
  });
  await api.login('driver', 'secret');
  calls.length = 0;
  return api;
}

const writesSent = () => calls.filter((call) => call.method !== 'GET');

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockKeychain.clear();
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  fetchMock = jest.fn();
  calls = [];
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('real mode with writes off: no fake success', () => {
  it('refuses every write that would change server data, sending nothing', async () => {
    const api = await realApp({ writes: false });
    const refused = { success: false, error: 'common.writesOff' };

    // Mock ids on purpose: if any of these fell through to the mock, it
    // would answer with a mock success or a mock rule instead.
    expect(await api.confirmRunsheetReceipt('RS-1')).toMatchObject(refused);
    expect(await api.confirmDelivery('TRK-5DF3697E', 42)).toMatchObject(refused);
    expect(await api.markDeliveryFailed('TRK-5DF3697E', 'ABSENT')).toMatchObject(refused);
    expect(await api.reopenParcel('TRK-1F4A7D93')).toMatchObject(refused);
    expect(await api.markNotificationRead('901')).toMatchObject(refused);
    expect(await api.markAllNotificationsRead()).toMatchObject(refused);

    const pickups = await api.completePickups(['1', '2']);
    expect(pickups).toMatchObject({ ...refused, succeeded: [], failed: ['1', '2'] });
    const returns = await api.confirmReturns(['TRK-9']);
    expect(returns).toMatchObject({ ...refused, succeeded: [], failed: ['TRK-9'] });

    expect(writesSent()).toEqual([]);
  });

  it('keeps delete and mark-unread on the phone, and they survive a refresh', async () => {
    const api = await realApp({ writes: false });

    expect(await api.deleteNotification('901')).toEqual({ success: true });
    expect(await api.markNotificationUnread('900')).toEqual({ success: true });
    expect(writesSent()).toEqual([]);

    const after = await api.getNotifications();
    expect(after.map((n) => n.id)).toEqual(['900']);
    // Read on the server, unread on this phone.
    expect(after[0].read).toBe(false);

    // Marking it read again needs no server write: the server already has it read.
    expect(await api.markNotificationRead('900')).toEqual({ success: true });
    expect((await api.getNotifications())[0].read).toBe(true);
    expect(writesSent()).toEqual([]);
  });

  it('clears all on the phone; alerts that arrive later still show', async () => {
    const api = await realApp({ writes: false });
    expect(await api.deleteAllNotifications()).toEqual({ success: true });
    expect(await api.getNotifications()).toEqual([]);

    NOTIFICATIONS.push({ id: 902, title: 'Nouveau', message: 'x', type: 'INFO', isRead: false, createdAt: '2026-09-26T10:00:00' });
    try {
      expect((await api.getNotifications()).map((n) => n.id)).toEqual(['902']);
    } finally {
      NOTIFICATIONS.pop();
    }
    expect(writesSent()).toEqual([]);
  });

  it('a scan finds the driver’s parcel without claiming to confirm anything', async () => {
    const api = await realApp({ writes: false });
    expect(await api.confirmScan('TRK-5DF3697E')).toMatchObject({ success: false, error: 'scanner.errors.notRecognized' });
    expect(writesSent()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Writes switched ON — against a stand-in server, never jibex.cloud.
// ═══════════════════════════════════════════════════════════════════════════

type Item = { id: number; sequenceOrder: number; status: string; failureReason: string | null; notes: string | null; parcel: Record<string, unknown> };
type Run = { id: number; code: string; status: string; items: Item[] };

/** A parcel whose server id is deliberately NOT its item id — so a mix-up can't pass. */
function parcelOn(parcelId: number, tracking: string, extra: Record<string, unknown> = {}) {
  return { id: parcelId, trackingNumber: tracking, status: 'EN_COURS', recipientName: 'Client', recipientPhone: '20000000', recipientAddress: 'Rue 1', recipientCity: 'Tunis', amountToCollect: 30, price: 37, deliveryFee: 7, ...extra };
}

function line(itemId: number, parcelId: number, tracking: string, status = 'PENDING', seq = 1): Item {
  return { id: itemId, sequenceOrder: seq, status, failureReason: null, notes: null, parcel: parcelOn(parcelId, tracking) };
}

/**
 * A small, stateful stand-in for the backend: it applies the writes it
 * accepts, so a later read shows their effect — or refuses on cue.
 */
function standInServer() {
  const runs: Run[] = [
    { id: 70, code: 'RS-70', status: 'PENDING', items: [line(801, 9801, 'TRK-A1')] },
    {
      id: 71,
      code: 'RS-71',
      status: 'IN_PROGRESS',
      items: [line(811, 9811, 'TRK-B1'), line(812, 9812, 'TRK-B2', 'DELIVERED', 2)],
    },
    { id: 72, code: 'RS-72', status: 'IN_PROGRESS', items: [line(821, 9821, 'TRK-C1'), line(822, 9822, 'TRK-C2', 'PENDING_DRIVER_CONFIRMATION', 2)] },
    { id: 73, code: 'RS-73', status: 'DRIVER_CONFIRMED', items: [line(831, 9831, 'TRK-D1')] },
  ];
  const closed: Run = { id: 60, code: 'RS-60', status: 'COMPLETED', items: [line(601, 9601, 'TRK-H1', 'DELIVERED')] };
  const pickups = [
    { id: 1, requestNumber: 'PU-1', status: 'SCHEDULED' },
    { id: 2, requestNumber: 'PU-2', status: 'IN_PROGRESS' },
  ];
  const returns = [
    { ...parcelOn(5001, 'TRK-R1'), status: 'RETOUR_A_CHARGER', senderName: 'Boutique A' },
    { ...parcelOn(5002, 'TRK-R2'), status: 'EN_TRANSIT_RETOUR', senderName: 'Boutique B' },
  ];
  const fail = { start: false, itemStatus: false, pickupComplete2: false, rejectMissing: true };

  const route = (url: string, method: string, body?: string): Promise<Response> => {
    const u = url.replace('https://jibex.cloud/', '');
    const runOf = (id: string) => [...runs, closed].find((r) => String(r.id) === id);
    let m: RegExpMatchArray | null;

    if (u === 'api/auth/login') {
      return json(200, { token: 't', role: 'DRIVER', user: { id: USER_ID, driverId: DRIVER_ID, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true } });
    }
    if (method === 'GET' && u === `api/runsheets/driver/${DRIVER_ID}/active`) return json(200, runs);
    if (method === 'GET' && u === `api/runsheets?driverId=${DRIVER_ID}`) return json(200, [...runs, closed]);
    if (method === 'GET' && (m = u.match(/^api\/runsheets\/(\d+)$/))) return json(200, runOf(m[1]));
    if (method === 'PUT' && (m = u.match(/^api\/runsheets\/(\d+)\/(driver-confirm|start|confirm-new-parcels|driver-reject|reject-new-parcels)$/))) {
      const run = runOf(m[1])!;
      switch (m[2]) {
        case 'driver-confirm':
          run.status = 'DRIVER_CONFIRMED';
          return json(200, run);
        case 'start':
          if (fail.start) return json(500, { error: 'Démarrage impossible' });
          run.status = 'IN_PROGRESS';
          return json(200, run);
        case 'confirm-new-parcels':
          run.items.forEach((item) => {
            if (item.status === 'PENDING_DRIVER_CONFIRMATION') item.status = 'PENDING';
          });
          return json(200, run);
        default:
          return fail.rejectMissing ? json(404, { error: 'Not Found' }) : json(200, run);
      }
    }
    if (method === 'PUT' && (m = u.match(/^api\/runsheets\/items\/(\d+)\/status$/))) {
      const item = [...runs, closed].flatMap((r) => r.items).find((i) => String(i.id) === m![1]);
      if (!item) return json(404, { error: 'Item introuvable' });
      if (fail.itemStatus) return json(400, { error: 'Statut invalide' });
      const next = JSON.parse(body ?? '{}');
      item.status = next.status;
      item.failureReason = next.failureReason ?? null;
      item.notes = next.notes ?? null;
      return json(200, {});
    }
    if (method === 'GET' && u === `api/pickup-requests/driver/${DRIVER_ID}`) return json(200, pickups);
    if (method === 'GET' && u.match(/^api\/pickup-requests\/\d+\/parcels$/)) return json(200, []);
    if (method === 'PUT' && (m = u.match(/^api\/pickup-requests\/(\d+)\/(start|complete)$/))) {
      const pickup = pickups.find((p) => String(p.id) === m![1])!;
      if (m[2] === 'complete' && pickup.id === 2 && fail.pickupComplete2) return json(409, { error: 'Collecte déjà clôturée' });
      pickup.status = m[2] === 'start' ? 'IN_PROGRESS' : 'COMPLETED';
      return json(200, {});
    }
    if (method === 'POST' && u.match(/^api\/transfers\/\d+\/confirm-pickup\?driverId=\d+$/)) return json(200, {});
    if (method === 'GET' && u === `api/return-management/driver/${DRIVER_ID}/assigned`) return json(200, returns);
    if (method === 'POST' && u === `api/return-management/driver/${DRIVER_ID}/confirm-loaded`) {
      const loaded = returns.filter((r) => r.status === 'RETOUR_A_CHARGER');
      loaded.forEach((r) => (r.status = 'EN_TRANSIT_RETOUR'));
      return json(200, loaded);
    }
    if (method === 'POST' && u.match(/^api\/return-management\/\d+\/confirm-delivered\?driverId=\d+$/)) return json(200, {});
    if (method === 'GET' && u === `api/notifications/user/${USER_ID}`) return json(200, NOTIFICATIONS);
    if (method === 'PUT' && u.match(/^api\/notifications\/\d+\/read$/)) return json(200, {});
    if (method === 'PUT' && u === `api/notifications/user/${USER_ID}/read-all`) return json(200, {});
    return json(404, { error: `no route for ${method} ${u}` });
  };
  return { runs, closed, pickups, returns, fail, route };
}

async function writingApp(): Promise<{ api: Api; server: ReturnType<typeof standInServer> }> {
  const server = standInServer();
  let api!: Api;
  jest.isolateModules(() => {
    jest.doMock('../constants/backend', () => ({
      ...jest.requireActual('../constants/backend'),
      API_MODE: 'real',
      API_WRITES: true,
    }));
    api = require('../services/api');
  });
  fetchMock.mockImplementation((url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body as string | undefined });
    return server.route(url, method, init.body as string | undefined);
  });
  await api.login('driver', 'secret');
  calls.length = 0;
  return { api, server };
}

/** "PUT api/runsheets/70/start" etc., in the order sent. */
const writeLines = () => writesSent().map((call) => `${call.method} ${call.url.replace('https://jibex.cloud/', '')}`);

/** Past the 3-second window in which reads share one fetch. */
const nextRead = () => new Promise((resolve) => setTimeout(resolve, 3_100));

describe('writes on: the runsheet flow', () => {
  it('confirms receipt, then starts the run — in that order', async () => {
    const { api } = await writingApp();
    expect(await api.confirmRunsheetReceipt('70')).toEqual({ success: true });
    expect(writeLines()).toEqual(['PUT api/runsheets/70/driver-confirm', 'PUT api/runsheets/70/start']);
  });

  it('when starting fails after the confirmation, offers "Start run" and retries only the start', async () => {
    const { api, server } = await writingApp();
    server.fail.start = true;
    const first = await api.confirmRunsheetReceipt('70');
    expect(first).toMatchObject({ success: false, error: 'runsheets.confirm.startFailed', confirmedOnly: true });
    expect(writeLines()).toEqual(['PUT api/runsheets/70/driver-confirm', 'PUT api/runsheets/70/start']);

    // The server now has it DRIVER_CONFIRMED: still locked, and the card says "Start run".
    const run = (await api.getRunsheets()).find((r) => r.id === '70');
    expect(run).toMatchObject({ needsStart: true, needsConfirmation: true, serverStatus: 'DRIVER_CONFIRMED' });

    server.fail.start = false;
    calls.length = 0;
    expect(await api.confirmRunsheetReceipt('70')).toEqual({ success: true });
    expect(writeLines()).toEqual(['PUT api/runsheets/70/start']);
  });

  it('re-confirms parcels dispatch added to a running run', async () => {
    const { api } = await writingApp();
    expect(await api.confirmRunsheetReceipt('72')).toEqual({ success: true });
    expect(writeLines()).toEqual(['PUT api/runsheets/72/confirm-new-parcels']);
  });

  it('refuses with the reason, and reads a missing endpoint as "not available yet"', async () => {
    const { api, server } = await writingApp();
    expect(await api.rejectRunsheet('70', '   ')).toEqual({ success: false, error: 'runsheets.refuse.reasonRequired' });
    expect(writesSent()).toEqual([]);

    expect(await api.rejectRunsheet('70', 'Véhicule en panne')).toEqual({ success: false, error: 'common.notAvailableYet' });
    expect(await api.rejectNewParcels('72', 'Plus de place')).toEqual({ success: false, error: 'common.notAvailableYet' });

    server.fail.rejectMissing = false;
    expect(await api.rejectRunsheet('70', 'Véhicule en panne')).toEqual({ success: true });
    const last = writesSent().at(-1)!;
    expect(last.url).toBe('https://jibex.cloud/api/runsheets/70/driver-reject');
    expect(JSON.parse(last.body!)).toEqual({ reason: 'Véhicule en panne' });
  });
});

describe('writes on: delivered, failed and corrections', () => {
  it('sends the RUNSHEET ITEM id, never the parcel id', async () => {
    const { api } = await writingApp();
    await api.logCallAttempt('TRK-B1');
    const result = await api.confirmDelivery('TRK-B1', 30);
    expect(result).toMatchObject({ success: true, job: { id: 'TRK-B1', status: 'DELIVERED', cashCollected: 30 } });

    expect(writeLines()).toEqual(['PUT api/runsheets/items/811/status']);
    expect(JSON.parse(writesSent()[0].body!)).toEqual({ status: 'DELIVERED' });
    // 9811 is the parcel's own id: it must never be what's sent.
    expect(calls.some((call) => call.url.includes('9811'))).toBe(false);
  });

  it('refuses before sending anything: no call yet, or a run that isn’t IN_PROGRESS', async () => {
    const { api } = await writingApp();
    expect(await api.confirmDelivery('TRK-B1', 30)).toEqual({ success: false, error: 'statusUpdate.callRequired' });

    await api.logCallAttempt('TRK-D1');
    expect(await api.confirmDelivery('TRK-D1', 30)).toEqual({ success: false, error: 'statusUpdate.runNotStarted' });
    expect(await api.markDeliveryFailed('TRK-D1', 'ABSENT')).toEqual({ success: false, error: 'statusUpdate.runNotStarted' });
    expect(writesSent()).toEqual([]);
  });

  it('records a failure with the exact reason name, the driver’s note first, then the call log and location', async () => {
    const { api } = await writingApp();
    await api.logCallAttempt('TRK-B1');
    await api.logCallAttempt('TRK-B1');
    calls.length = 0;
    const fix = { lat: 36.8, lng: 10.18 };
    const result = await api.markDeliveryFailed('TRK-B1', 'NO_ANSWER', 'Sonné trois fois', fix);
    expect(result.success).toBe(true);

    expect(writeLines()).toEqual(['PUT api/runsheets/items/811/status']);
    const body = JSON.parse(writesSent()[0].body!);
    expect(body).toMatchObject({ status: 'FAILED', failureReason: 'NO_ANSWER' });
    // No coordinates field: the proof rides in the notes, as one readable line.
    expect(Object.keys(body).sort()).toEqual(['failureReason', 'notes', 'status']);
    expect(body.notes).toMatch(
      // In French for the agency, whatever the app's language.
      /^Sonné trois fois\nClient appelé 2 fois \(\d\d:\d\d, \d\d:\d\d\)\. Position : 36\.80000, 10\.18000\.$/
    );

    await nextRead();
    const failed = (await api.getHistoryParcels()).find((job) => job.id === 'TRK-B1');
    expect(failed).toMatchObject({ status: 'FAILED', failureReason: 'NO_ANSWER', failureLocation: fix });
  });

  it('corrects a parcel only while its run is open', async () => {
    const { api } = await writingApp();
    expect(await api.reopenParcel('TRK-H1')).toEqual({ success: false, error: 'statusUpdate.runClosed' });
    expect(writesSent()).toEqual([]);

    expect(await api.reopenParcel('TRK-B2')).toMatchObject({ success: true, job: { status: 'PENDING' } });
    expect(writeLines()).toEqual(['PUT api/runsheets/items/812/status']);
    expect(JSON.parse(writesSent()[0].body!)).toEqual({ status: 'PENDING' });
  });

  it('changes nothing when the server says no, and shows its reason', async () => {
    const { api, server } = await writingApp();
    server.fail.itemStatus = true;
    await api.logCallAttempt('TRK-B1');
    expect(await api.confirmDelivery('TRK-B1', 30)).toEqual({
      success: false,
      error: 'common.serverRefused',
      errorParams: { reason: 'Statut invalide' },
    });
    await nextRead();
    expect((await api.getActiveParcels()).find((job) => job.id === 'TRK-B1')?.status).toBe('PENDING');
  });
});

describe('writes on: pickups, transfers, returns, alerts', () => {
  it('starts then completes each pickup, and reports the ones that failed', async () => {
    const { api, server } = await writingApp();
    server.fail.pickupComplete2 = true;
    const result = await api.completePickups(['1', '2']);
    expect(result).toMatchObject({ success: false, succeeded: ['1'], failed: ['2'], error: 'common.serverRefused' });
    expect(writeLines()).toEqual([
      'PUT api/pickup-requests/1/start',
      'PUT api/pickup-requests/1/complete',
      // Already IN_PROGRESS: straight to complete.
      'PUT api/pickup-requests/2/complete',
    ]);
  });

  it('confirms a transfer pickup by the server’s id and the driver id', async () => {
    const { api } = await writingApp();
    const transfer = {
      id: 'TRF-44',
      status: 'IN_PROGRESS' as const,
      originAgency: 'A',
      destinationAgency: 'B',
      parcelCount: 3,
      location: 'A',
      scheduledAt: '',
      awaitingPickupConfirmation: true,
      server: { transferId: '44', parcelTrackingNumbers: [], scanDeparture: false, scanArrival: false, missingParcels: 0, extraParcels: 0, damagedParcels: 0 },
    };
    expect(await api.confirmTransferPickup(transfer)).toEqual({ success: true });
    expect(writeLines()).toEqual([`POST api/transfers/44/confirm-pickup?driverId=${DRIVER_ID}`]);
  });

  it('loads returns all at once, and hands each back by its parcel id', async () => {
    const { api } = await writingApp();
    const returns = await api.getReturns();
    expect(returns.map((r) => [r.id, r.stage])).toEqual([
      ['TRK-R1', 'TO_LOAD'],
      ['TRK-R2', 'TO_HAND_BACK'],
    ]);
    const result = await api.confirmReturns(['TRK-R1', 'TRK-R2']);
    expect(result).toMatchObject({ success: true, succeeded: ['TRK-R1', 'TRK-R2'], failed: [] });
    expect(writeLines()).toEqual([
      `POST api/return-management/driver/${DRIVER_ID}/confirm-loaded`,
      `POST api/return-management/5002/confirm-delivered?driverId=${DRIVER_ID}`,
    ]);
  });

  it('marks one alert read by its id, and all of them by the USER account id', async () => {
    const { api } = await writingApp();
    expect(await api.markNotificationRead('901')).toEqual({ success: true });
    expect(await api.markAllNotificationsRead()).toEqual({ success: true });
    expect(writeLines()).toEqual(['PUT api/notifications/901/read', `PUT api/notifications/user/${USER_ID}/read-all`]);
  });
});

describe('writes off: the new actions send nothing either', () => {
  it('refuse, start and transfer pickup are refused on the phone', async () => {
    const api = await realApp({ writes: false });
    expect(await api.rejectRunsheet('70', 'Panne')).toMatchObject({ success: false, error: 'common.writesOff' });
    expect(await api.rejectNewParcels('72', 'Panne')).toMatchObject({ success: false, error: 'common.writesOff' });
    const transfer = { id: 'T', status: 'IN_PROGRESS' as const, originAgency: '', destinationAgency: '', parcelCount: 0, location: '', scheduledAt: '' };
    expect(await api.confirmTransferPickup(transfer)).toMatchObject({ success: false, error: 'common.writesOff' });
    expect(writesSent()).toEqual([]);
  });
});
