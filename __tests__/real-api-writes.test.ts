/**
 * Writes on the real server.
 *
 * With `EXPO_PUBLIC_API_WRITES` off (the default), real mode must never show
 * a fake success: every action that would change server data is refused on
 * the phone, sends nothing, and never falls through to the mock. Nothing
 * here talks to jibex.cloud — `fetch` is a stand-in server.
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
      SERVER_WRITES_OFF: !writes,
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
    expect(await api.confirmDeliveryWithPhoto('TRK-5DF3697E', 'file://x.jpg', 42)).toMatchObject(refused);
    expect(await api.confirmDeliveryWithOTP('TRK-5DF3697E', '4187', 42)).toMatchObject(refused);
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
