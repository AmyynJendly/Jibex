/**
 * The transfer detail screen. The Android app opens a transfer and shows its
 * itinerary, driver, dated history, every parcel with its status and cash,
 * and the notes. We had one card, and after the driver confirmed, not even
 * the parcel list — while the parcels' statuses differ ("Dépôt relais" next
 * to "En transit").
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import fr from '../lib/i18n/fr';
import { i18next } from '../lib/i18n';
import { parcelStatusLabel } from '../lib/parcelStatus';
import { formatStamp, opensDetail, transferTimeline } from '../lib/transferState';
import { toTransfer } from '../services/real-api';

const t = i18next.getFixedT('fr');

/** TRF-FA75ED72 as the live server sent it after the driver took it (people shortened). */
const IN_TRANSIT = {
  id: 3,
  transferNumber: 'TRF-FA75ED72',
  status: 'IN_TRANSIT',
  transferType: 'HUB_RELAY',
  fromAgency: { id: 2, name: 'jihed agence', city: 'Tunis' },
  toAgency: { id: 12, name: 'jihedb', city: 'Sousse' },
  driverName: 'mourad',
  driverPhone: '24173544',
  vehicleRegistration: 'TUN-261',
  notes: 'Créé automatiquement — routage à l’entrée stock',
  createdAt: '2026-08-29T15:17:00',
  validatedAt: '2026-10-02T21:12:00',
  confirmedAt: '2026-10-02T21:13:43',
  parcels: [
    { trackingNumber: 'TUN-100-51B62DC7', recipientName: 'test', recipientCity: 'Médenine, Ajim', status: 'EN_TRANSIT_AGENCE', price: 1520, recipientPhone: '20000000' },
    { trackingNumber: 'TUN-100-6107B96B', recipientName: 'TEST AMYYN', recipientCity: 'Sousse, Sousse Médina', status: 'AU_DEPOT_RELAIS', price: 10 },
  ],
};

describe('what the detail screen shows', () => {
  const transfer = toTransfer(IN_TRANSIT)!;
  const detail = transfer.detail!;

  it('has the header, the itinerary and the driver', () => {
    expect(transfer.id).toBe('TRF-FA75ED72');
    expect(detail.type).toBe('HUB_RELAY');
    expect(fr.transfers.detail.type.HUB_RELAY).toBe('Hub relais');
    expect(transfer.originAgency).toBe('jihed agence');
    expect(transfer.destinationAgency).toBe('jihedb');
    expect(detail.driverName).toBe('mourad');
    expect(detail.vehicle).toBe('TUN-261');
    expect(detail.notes).toBe('Créé automatiquement — routage à l’entrée stock');
  });

  it('lists every parcel with its own status and cash', () => {
    expect(detail.parcels).toEqual([
      { trackingNumber: 'TUN-100-51B62DC7', recipientName: 'test', recipientCity: 'Médenine, Ajim', status: 'EN_TRANSIT_AGENCE', price: 1520 },
      { trackingNumber: 'TUN-100-6107B96B', recipientName: 'TEST AMYYN', recipientCity: 'Sousse, Sousse Médina', status: 'AU_DEPOT_RELAIS', price: 10 },
    ]);
    expect(parcelStatusLabel(t, 'AU_DEPOT_RELAIS')).toBe('Au dépôt relais');
    expect(parcelStatusLabel(t, 'EN_TRANSIT_AGENCE')).toBe('En transit (transfert)');
  });

  it('carries no phone number at all', () => {
    expect(JSON.stringify(detail)).not.toContain('24173544');
    expect(JSON.stringify(detail)).not.toContain('20000000');
    expect(JSON.stringify(detail).toLowerCase()).not.toContain('phone');
  });

  it('tells the history with dates: Créé, Prêt pour chargement, Pris en charge, Terminé', () => {
    const steps = transferTimeline(detail);
    expect(steps.map((step) => [t('transfers.detail.steps.' + step.key), formatStamp(step.at), step.done])).toEqual([
      ['Créé', '29/08/2026 15:17', true],
      ['Prêt pour chargement', '02/10/2026 21:12', true],
      ['Pris en charge par le chauffeur', '02/10/2026 21:13', true],
      ['Terminé', undefined, false],
    ]);
  });
});

describe('the transfer history (timeline)', () => {
  it('before the driver takes it: only "Créé" and "Prêt" are done', () => {
    const steps = transferTimeline({ createdAt: '2026-10-02T10:00:00', readyAt: '2026-10-02T11:00:00' });
    expect(steps.map((step) => [step.key, step.done])).toEqual([
      ['created', true],
      ['ready', true],
      ['taken', false],
      ['closed', false],
    ]);
  });

  it('a cancelled transfer stops at "Annulé"', () => {
    const steps = transferTimeline({ createdAt: '2026-10-02T10:00:00', cancelledAt: '2026-10-02T12:00:00' });
    expect(steps.map((step) => step.key)).toEqual(['created', 'cancelled']);
    expect(fr.transfers.detail.steps.cancelled).toBe('Annulé');
  });

  it('uses the old fields of transfers made before the new workflow', () => {
    const legacy = toTransfer({ ...IN_TRANSIT, confirmedAt: null, shippedAt: '2026-07-01T09:00:00', status: 'SHIPPED' })!;
    expect(legacy.detail?.takenAt).toBe('2026-07-01T09:00:00');
  });

  it('prints a date as the server sent it, and nothing for a missing one', () => {
    expect(formatStamp('2026-10-02T21:13:43')).toBe('02/10/2026 21:13');
    expect(formatStamp('2026-10-02 21:13:43.123')).toBe('02/10/2026 21:13');
    expect(formatStamp(undefined)).toBeUndefined();
    expect(formatStamp('hier')).toBeUndefined();
  });
});

describe('which transfers open the detail screen', () => {
  it('an ongoing one does — to load, or on the way', () => {
    expect(opensDetail(toTransfer({ ...IN_TRANSIT, status: 'READY_FOR_PICKUP' })!)).toBe(true);
    expect(opensDetail(toTransfer(IN_TRANSIT)!)).toBe(true);
  });

  it('one in History does not: it stays a read-only card', () => {
    expect(opensDetail(toTransfer({ ...IN_TRANSIT, status: 'COMPLETED' })!)).toBe(false);
  });
});

describe('what the destination agency found', () => {
  it('keeps the counts of missing, extra and damaged parcels', () => {
    const transfer = toTransfer({ ...IN_TRANSIT, missingParcels: 1, extraParcels: 0, damagedParcels: 2 })!;
    expect(transfer.detail).toMatchObject({ missingParcels: 1, extraParcels: 0, damagedParcels: 2 });
    expect(t('transfers.detail.missing', { count: 1 })).toBe('1 colis manquant');
    expect(t('transfers.detail.damaged', { count: 2 })).toBe('2 colis endommagés');
  });
});

describe('mock data', () => {
  it('has a transfer with a full detail, and taking it puts its parcels in transit', async () => {
    (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
    let api!: typeof import('../services/mock-api');
    jest.isolateModules(() => {
      api = require('../services/mock-api');
    });
    const waiting = (await api.getTransfers()).find((item) => item.awaitingPickupConfirmation && item.detail)!;
    expect(waiting.detail!.parcels).toHaveLength(waiting.parcelCount);
    expect(transferTimeline(waiting.detail!).map((step) => step.done)).toEqual([true, true, false, false]);

    await api.confirmTransferPickup(waiting);
    const after = (await api.getTransfers()).find((item) => item.id === waiting.id)!;
    expect(transferTimeline(after.detail!).map((step) => step.done)).toEqual([true, true, true, false]);
    expect(new Set(after.detail!.parcels.map((parcel) => parcel.status))).toEqual(new Set(['EN_TRANSIT_AGENCE']));
    expect(opensDetail(after)).toBe(true);
  });
});
