/**
 * Pickups, transfers, returns and notifications, against a stand-in server
 * shaped like what jibex.cloud returned (field names and kinds copied from
 * real responses; people, places and numbers made up).
 *
 * The account has DIFFERENT ids on purpose — user 7, driver 31 — because the
 * real test account has both at 3: notifications must go by the user id and
 * everything else by the driver id, and only different values can prove it.
 */

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

type RealApi = typeof import('../services/real-api');

const USER_ID = 7;
const DRIVER_ID = 31;

// What the server really nests inside a pickup: the whole merchant record,
// bank details and national id included. None of it may come out the other side.
const SENDER = {
  id: 4, name: 'Boutique Test', code: 'EXP-004', phone: '71000000', email: 'shop@example.tn',
  address: 'Rue du Commerce', contactPerson: 'M. Test', cin: 'CIN-SECRET-123', rib: 'RIB-SECRET-456',
  bankName: 'Banque X', patenteFiscale: 'PF-SECRET', ville: 'Tunis', gouvernorat: 'Tunis',
  fixDeliveryPrice: 7, active: true, username: 'shop-login', hasAccount: true,
};
const DRIVER_RECORD = { id: DRIVER_ID, fullName: 'Driver Test', cin: 'DRIVER-CIN-SECRET', licenseNumber: 'LIC-SECRET', salary: 1234.5 };

const PICKUPS = [
  { id: 1, requestNumber: 'PU-3-20260926-0001', status: 'SCHEDULED', pickupAddress: 'Zone Industrielle', pickupCity: null,
    contactPerson: 'Contact Un', contactPhone: '22000000', scheduledAt: '2026-09-26T14:30:00', requestedDate: '2026-09-26',
    timeSlot: null, estimatedParcelsCount: 3, notes: null, sender: SENDER, assignedDriver: DRIVER_RECORD, company: { id: 3, name: 'test' } },
  { id: 2, requestNumber: 'PU-3-20260925-0001', status: 'COMPLETED', pickupAddress: 'Avenue Test', pickupCity: 'Sousse',
    contactPerson: 'Contact Deux', contactPhone: '23000000', scheduledAt: '2026-09-25T09:00:00', timeSlot: '09:00–10:00',
    estimatedParcelsCount: 1, sender: SENDER },
  { id: 3, requestNumber: 'PU-3-20260924-0001', status: 'CANCELLED', sender: SENDER },
  { id: 4, requestNumber: 'PU-3-20260923-0001', status: 'SOMETHING_NEW', sender: SENDER },
];
const PICKUP_PARCELS: Record<string, unknown[]> = {
  '1': [
    { id: 71, trackingNumber: 'TRK-00000071', recipientName: 'Client A', recipientAddress: 'Rue A', recipientCity: 'Tunis',
      price: 120, amountToCollect: 110, deliveryFee: 10, sender: SENDER, driver: DRIVER_RECORD },
  ],
};

const TRANSFER = {
  id: 1, transferNumber: 'TRF-7093829A', status: 'READY_FOR_PICKUP', transferType: 'HUB_RELAY',
  fromAgency: { id: 1, name: 'Agence Sousse', city: 'Sousse', code: 'AG1', phone: '73000000' },
  toAgency: { id: 2, name: 'Agence Sfax', city: 'Sfax' },
  fromCompany: { id: 3, name: 'test' }, toCompany: { id: 3, name: 'test' },
  driver: null, driverName: 'Driver Test', driverPhone: '24000000', vehicleRegistration: '123 TU 4567',
  parcels: [{ trackingNumber: 'TRK-00000081' }, { trackingNumber: 'TRK-00000082' }],
  notes: 'Fragile en haut', scannedCount: 2, scanDeparture: true, scanArrival: false,
  missingParcels: 0, extraParcels: 0, damagedParcels: 1, discrepancyNotes: null,
  createdAt: '2026-09-26T08:00:00', validatedAt: '2026-09-26T09:00:00', acceptedAt: null, updatedAt: '2026-09-26T09:00:00',
};
const TRANSFERS = [
  TRANSFER,
  { ...TRANSFER, id: 2, transferNumber: 'TRF-00000002', status: 'SHIPPED', transferType: 'SOMETHING_NEW' },
  { ...TRANSFER, id: 3, transferNumber: 'TRF-00000003', status: 'CANCELLED' },
  { ...TRANSFER, id: 4, transferNumber: 'TRF-00000004', status: 'NEVER_SEEN_BEFORE' },
];

const RETURNS = [
  { id: 91, trackingNumber: 'TRK-00000091', status: 'RETOUR_A_CHARGER', senderName: 'Boutique Test', senderPhone: '71000000',
    senderAddress: 'Rue du Commerce', senderAgencyName: 'Agence Tunis', returnType: 'TO_SENDER', lastScanTime: '2026-09-26T07:00:00', sender: SENDER },
  { id: 92, trackingNumber: 'TRK-00000092', status: 'RETOUR_RECU', senderName: 'Autre Boutique' },
];

const NOTIFICATIONS = [
  { id: 11, title: 'Nouveau colis', message: 'Un colis a été ajouté', type: 'PARCEL_STATUS_CHANGE', isRead: false,
    createdAt: '2026-09-26T10:00:00', referenceId: 501, referenceType: 'PARCEL' },
  { id: 12, title: 'Pickup assigné', message: 'Chez Boutique Test', type: 'PICKUP_ASSIGNED', isRead: true,
    createdAt: '2026-09-26T11:00:00', referenceId: 1, referenceType: 'PICKUP_REQUEST' },
  { id: 13, title: 'Réclamation', message: 'Traitée', type: 'COMPLAINT_RESOLVED', isRead: false,
    createdAt: '2026-09-25T09:00:00', referenceId: null, referenceType: null },
  { id: 14, title: '?', message: '?', type: 'BRAND_NEW_KIND', isRead: false, createdAt: '2026-09-24T09:00:00' },
];

const ACTIVE_RUNSHEETS = [
  { id: 60, code: 'RS-1', status: 'IN_PROGRESS',
    items: [{ id: 5001, sequenceOrder: 1, status: 'PENDING', parcel: { id: 501, trackingNumber: 'TRK-00000501', amountToCollect: 10 } }] },
];

let fetchMock: jest.Mock;
let urls: string[];

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

async function signedIn(): Promise<RealApi> {
  let api!: RealApi;
  jest.isolateModules(() => {
    api = require('../services/real-api');
  });
  fetchMock.mockImplementation((url: string) => {
    urls.push(url);
    const path = url.replace('https://jibex.cloud/', '');
    if (path === 'api/auth/login') {
      return json(200, { token: 't', role: 'DRIVER', portal: '/driver',
        user: { id: USER_ID, driverId: DRIVER_ID, username: 'driver', fullName: 'Driver Test', role: 'DRIVER', active: true } });
    }
    if (path === `api/pickup-requests/driver/${DRIVER_ID}`) return json(200, PICKUPS);
    const pickupParcels = path.match(/^api\/pickup-requests\/(\d+)\/parcels$/);
    if (pickupParcels) return json(200, PICKUP_PARCELS[pickupParcels[1]] ?? []);
    if (path === `api/transfers/driver/${DRIVER_ID}`) return json(200, TRANSFERS);
    if (path === 'api/transfers/1') return json(200, TRANSFER);
    if (path === `api/return-management/driver/${DRIVER_ID}/assigned`) return json(200, RETURNS);
    if (path === `api/notifications/user/${USER_ID}`) return json(200, NOTIFICATIONS);
    if (path === `api/runsheets/driver/${DRIVER_ID}/active`) return json(200, ACTIVE_RUNSHEETS);
    return json(404, { error: `unexpected ${path}` });
  });
  await api.login('driver', 'secret');
  urls.length = 0;
  return api;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockKeychain.clear();
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
  fetchMock = jest.fn();
  urls = [];
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('which id each endpoint gets', () => {
  it('pickups, transfers and returns go by the DRIVER id; notifications by the USER id', async () => {
    const api = await signedIn();
    await api.getPickups();
    await api.getTransfers();
    await api.getReturns();
    await api.getNotifications();
    const paths = urls.map((url) => url.replace('https://jibex.cloud/', ''));

    expect(paths).toContain(`api/pickup-requests/driver/${DRIVER_ID}`);
    expect(paths).toContain(`api/transfers/driver/${DRIVER_ID}`);
    expect(paths).toContain(`api/return-management/driver/${DRIVER_ID}/assigned`);
    expect(paths).toContain(`api/notifications/user/${USER_ID}`);
    expect(paths.some((p) => p.includes(`/driver/${USER_ID}`))).toBe(false);
    expect(paths.some((p) => p.includes(`/user/${DRIVER_ID}`))).toBe(false);
  });
});

describe('real pickups', () => {
  it('maps them with their parcels, cancelled ones left out, unknown ones read-only', async () => {
    const api = await signedIn();
    const pickups = await api.getPickups();
    expect(pickups.map((p) => [p.id, p.status])).toEqual([
      ['1', 'SCHEDULED'],
      ['2', 'COMPLETED'],
      ['4', 'COMPLETED'],
    ]);
    const [open] = pickups;
    expect(open).toMatchObject({
      businessName: 'Boutique Test',
      // pickupCity is null: the city comes from the sender's record.
      address: 'Zone Industrielle, Tunis',
      contactName: 'Contact Un',
      packageCount: 1,
      server: { pickupId: '1', requestNumber: 'PU-3-20260926-0001', status: 'SCHEDULED', estimatedParcelsCount: 3 },
    });
    expect(open.parcels).toEqual([{ trackingNumber: 'TRK-00000071', contactName: 'Client A', address: 'Rue A, Tunis', codAmount: 120 }]);
    expect(pickups[1].timeWindow).toBe('09:00–10:00');
  });

  it('never carries the merchant’s or driver’s private details', async () => {
    const api = await signedIn();
    const everything = JSON.stringify([await api.getPickups(), await api.getReturns()]);
    for (const secret of ['CIN-SECRET-123', 'RIB-SECRET-456', 'PF-SECRET', 'shop-login', 'DRIVER-CIN-SECRET', 'LIC-SECRET', '1234.5']) {
      expect(everything).not.toContain(secret);
    }
  });
});

describe('real transfers', () => {
  it('maps the list: printed number as id, drafts/cancelled out, unknown status read-only', async () => {
    const api = await signedIn();
    const transfers = await api.getTransfers();
    expect(transfers.map((t) => [t.id, t.status])).toEqual([
      ['TRF-7093829A', 'IN_PROGRESS'],
      ['TRF-00000002', 'IN_PROGRESS'],
      ['TRF-00000004', 'COMPLETED'],
    ]);
    expect(transfers[0]).toMatchObject({
      originAgency: 'Agence Sousse',
      destinationAgency: 'Agence Sfax',
      parcelCount: 2,
      location: 'Sousse',
      scheduledAt: '2026-09-26T09:00:00',
      server: { transferId: '1', transferType: 'HUB_RELAY', scanDeparture: true, damagedParcels: 1, vehicleRegistration: '123 TU 4567' },
    });
    // A type we don't know is kept raw rather than guessed.
    expect(transfers[1].server).toMatchObject({ rawType: 'SOMETHING_NEW', transferType: undefined });
  });

  it('fetches one transfer by the server’s numeric id', async () => {
    const api = await signedIn();
    const transfer = await api.getTransfer('1');
    expect(urls).toEqual(['https://jibex.cloud/api/transfers/1']);
    expect(transfer.id).toBe('TRF-7093829A');
  });
});

describe('real returns', () => {
  it('turns each returned parcel into a return of one, open while it’s with the driver', async () => {
    const api = await signedIn();
    const returns = await api.getReturns();
    expect(returns.map((r) => [r.id, r.status])).toEqual([
      ['TRK-00000091', 'PENDING_PICKUP'],
      ['TRK-00000092', 'PROCESSED'],
    ]);
    expect(returns[0]).toMatchObject({
      fromAgency: 'Agence Tunis',
      toAgency: 'Boutique Test',
      parcelCount: 1,
      location: 'Rue du Commerce',
      server: { parcelStatus: 'RETOUR_A_CHARGER', returnType: 'TO_SENDER' },
    });
  });
});

describe('real notifications', () => {
  it('shows the server’s own text, keeps type and reference, and knows where each one goes', async () => {
    const api = await signedIn();
    const notifications = await api.getNotifications();
    expect(notifications.map((n) => [n.id, n.type, n.read])).toEqual([
      ['12', 'PICKUP', true],
      ['11', 'DELIVERY', false],
      ['13', 'INFO', false],
      ['14', 'INFO', false],
    ]);
    const parcelAlert = notifications.find((n) => n.id === '11')!;
    expect(parcelAlert).toMatchObject({
      title: 'Nouveau colis',
      message: 'Un colis a été ajouté',
      // Server parcel 501 is the driver's TRK-00000501: open it directly.
      target: { screen: 'job', jobId: 'TRK-00000501' },
      server: { type: 'PARCEL_STATUS_CHANGE', referenceId: '501', referenceType: 'PARCEL' },
    });
    expect(notifications.find((n) => n.id === '12')!.target).toEqual({ screen: 'pickups', tab: 'SCHEDULED' });
    expect(notifications.find((n) => n.id === '14')!.server?.type).toBe('BRAND_NEW_KIND');
  });
});

describe('real scanner: a local lookup, never the tracking endpoint', () => {
  it('finds a parcel in each of the driver’s lists, and says where', async () => {
    const api = await signedIn();
    expect(await api.confirmScan('trk-00000501')).toMatchObject({ success: true, kind: 'job', id: 'TRK-00000501', checkedOnly: true });
    expect(await api.confirmScan('TRK-00000071')).toMatchObject({ success: true, kind: 'pickup', id: '1', label: 'Client A' });
    expect(await api.confirmScan('TRK-00000082')).toMatchObject({ success: true, kind: 'transfer', id: 'TRF-7093829A' });
    expect(await api.confirmScan('JIBEX-TRANSFER:TRF-7093829A')).toMatchObject({ success: true, kind: 'transfer', id: 'TRF-7093829A' });
    expect(await api.confirmScan('TRK-00000091')).toMatchObject({ success: true, kind: 'return', id: 'TRK-00000091' });
    expect(urls.some((url) => url.includes('/api/parcels/tracking/'))).toBe(false);
  });

  it('says "not recognized" for anything that isn’t the driver’s, without asking the server', async () => {
    const api = await signedIn();
    expect(await api.confirmScan('TRK-99999999')).toEqual({ success: false, error: 'scanner.errors.notRecognized' });
    expect(urls.some((url) => url.includes('/api/parcels/tracking/'))).toBe(false);
  });
});

describe('dispatch contact from the agency data already loaded', () => {
  it('takes the driver’s own agency (the one transfers leave from), never the receiving one', async () => {
    const api = await signedIn();
    // The runsheets here carry no agency contact; the transfer's sending agency has a phone.
    expect(await api.getDispatchContact()).toEqual({ phone: '73000000', email: undefined, agencyName: 'Agence Sousse' });
  });

  it('is remembered on the phone, so the login screen can offer it signed out — with no request', async () => {
    const api = await signedIn();
    await api.getDispatchContact();
    await api.logout();
    urls.length = 0;
    expect(await api.getDispatchContact()).toMatchObject({ phone: '73000000' });
    expect(urls).toEqual([]);
  });
});

describe('pickup city from the addresses', () => {
  it('finds the governorate in the sender’s address when the server gives no city', () => {
    const { toPickup } = require('../services/real-api') as RealApi;
    const pickup = toPickup({ id: 9, status: 'SCHEDULED', pickupAddress: 'Zone Industrielle', pickupCity: null, sender: { address: 'Route de Gabès km 4, Sfax' } });
    expect(pickup?.address).toBe('Zone Industrielle, Sfax');
  });

  it('doesn’t repeat a city the pickup address already names', () => {
    const { toPickup } = require('../services/real-api') as RealApi;
    const pickup = toPickup({ id: 9, status: 'SCHEDULED', pickupAddress: 'Rue X, Sousse', pickupCity: null, sender: { address: 'Sousse' } });
    expect(pickup?.address).toBe('Rue X, Sousse');
  });
});
