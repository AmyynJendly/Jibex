/**
 * A transfer before and after the driver takes it.
 *
 * In the live test the driver confirmed five parcels with one tap and no
 * scan; afterwards the app said "awaiting handover" and offered a scanner
 * that did nothing. The parcel list the driver scans comes from the server,
 * and confirming leaves the transfer with the driver, in transit, until the
 * destination agency receives it.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { checkProgress, checkScan, checkedOf, checklistKey } from '../lib/checklist';
import fr from '../lib/i18n/fr';
import { agencyShortName, transferStage } from '../lib/transferState';
import { toTransfer } from '../services/real-api';

type MockApi = typeof import('../services/mock-api');

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

function freshMock(): MockApi {
  let api!: MockApi;
  jest.isolateModules(() => {
    api = require('../services/mock-api');
  });
  return api;
}

/** TRF-FA75ED72 as the live server sent it, people left out. */
const READY = {
  id: 3,
  transferNumber: 'TRF-FA75ED72',
  status: 'READY_FOR_PICKUP',
  transferType: 'HUB_RELAY',
  fromAgency: { id: 2, name: 'jihed agence', city: 'Tunis' },
  toAgency: { id: 12, name: 'jihedb', city: 'Sousse' },
  parcels: [
    { trackingNumber: 'TUN-100-51B62DC7' },
    { trackingNumber: 'TUN-100-699F0F1D' },
    { trackingNumber: 'TUN-100-C9166BCA' },
    { trackingNumber: 'TUN-100-6107B96B' },
    { trackingNumber: 'TUN-100-561D8F37' },
  ],
};

describe('transfer pickup check', () => {
  it('gets the list of parcels to scan from the server', () => {
    const transfer = toTransfer(READY)!;
    expect(transfer.awaitingPickupConfirmation).toBe(true);
    expect(transfer.parcelCount).toBe(5);
    expect(transfer.parcelTrackingNumbers).toEqual(READY.parcels.map((p) => p.trackingNumber));
  });

  it('is only ready to confirm at 5/5, and refuses a parcel from elsewhere', () => {
    const transfer = toTransfer(READY)!;
    const key = checklistKey.transfer(transfer.id);
    const codes = transfer.parcelTrackingNumbers!;

    for (const code of codes.slice(0, 4)) checkScan(key, codes, code);
    expect(checkProgress(codes, checkedOf(key))).toMatchObject({ done: 4, total: 5, complete: false });

    expect(checkScan(key, codes, 'TUN-100-99BF3AE7')).toBe('unknown');
    expect(fr.scanner.check.notInTransfer).toBe('Ce colis n’est pas dans ce transfert');

    checkScan(key, codes, codes[4]);
    expect(checkProgress(codes, checkedOf(key)).complete).toBe(true);
  });

  it('after confirmation, stays with the driver as "in transit" — no longer awaiting pickup', () => {
    const transfer = toTransfer({ ...READY, status: 'IN_TRANSIT', confirmedAt: '2026-10-02T21:13:43' })!;
    expect(transfer.status).toBe('IN_PROGRESS');
    expect(transfer.awaitingPickupConfirmation).toBe(false);
    expect(transfer.destinationAgency).toBe('jihedb');
  });

  it('moves to history only once the destination agency has received it', () => {
    expect(toTransfer({ ...READY, status: 'COMPLETED' })!.status).toBe('COMPLETED');
  });

  it('behaves the same on mock data: confirm → in transit, still in the current list', async () => {
    const api = freshMock();
    const waiting = (await api.getTransfers()).find((tr) => tr.awaitingPickupConfirmation);
    if (!waiting) throw new Error('seed data has no transfer awaiting pickup');
    expect(waiting.parcelTrackingNumbers).toHaveLength(waiting.parcelCount);

    expect(await api.confirmTransferPickup(waiting)).toEqual({ success: true });
    const after = (await api.getTransfers()).find((tr) => tr.id === waiting.id)!;
    expect(after.status).toBe('IN_PROGRESS');
    expect(after.awaitingPickupConfirmation).toBe(false);

    // Confirming twice is refused: the pickup was already taken.
    expect((await api.confirmTransferPickup(after)).success).toBe(false);
  });

  it('has three stages: to load, on the way (nothing left to do), closed', () => {
    expect(transferStage(toTransfer(READY)!)).toBe('toLoad');
    expect(transferStage(toTransfer({ ...READY, status: 'IN_TRANSIT' })!)).toBe('onTheWay');
    expect(transferStage(toTransfer({ ...READY, status: 'COMPLETED' })!)).toBe('closed');
  });

  it('tells the driver their part is over and who closes the transfer', () => {
    expect(fr.transfers.onTheWay.title).toBe('En route vers {{agency}} — votre partie est terminée.');
    expect(fr.transfers.onTheWay.body).toBe('Le transfert sera clôturé quand l’agence {{agency}} scannera les colis.');
    expect(fr.transfers.status.inTransit).toBe('En transit');
    // "l’agence Agence Sfax" would read wrong.
    expect(agencyShortName('Agence Sfax')).toBe('Sfax');
    expect(agencyShortName('jihedb')).toBe('jihedb');
    expect(agencyShortName('Agence')).toBe('Agence');
  });

  it('has no handover QR left: scanning cannot close a transfer on mock data', async () => {
    const api = freshMock();
    const moving = (await api.getTransfers()).find((tr) => transferStage(tr) === 'onTheWay')!;
    expect((await api.confirmScan(`JIBEX-TRANSFER:${moving.id}`)).success).toBe(false);
    expect((await api.getTransfers()).find((tr) => tr.id === moving.id)!.status).toBe('IN_PROGRESS');
  });

  it('says it in the agency’s French', () => {
    expect(fr.transfers.check.confirm).toBe('Confirmer la prise en charge');
    expect(fr.transfers.check.withoutScan).toBe('Confirmer sans scan');
    expect(fr.transfers.check.progress).toBe('{{done}}/{{total}} colis');
  });
});
