/**
 * The failure reasons are the backend's own enum names, sent as-is — a
 * missing label, or a reason offered at the wrong moment, would only show up
 * on a driver's phone. These pin the list down.
 */
import en from '../lib/i18n/en';
import fr from '../lib/i18n/fr';
import {
  FAILURE_REASONS,
  commonReasonsFor,
  reasonNeedsNote,
  reasonsFor,
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

/** The web app's own French labels (its `{label, anomaly}` table). Hidden reasons keep theirs, for old records. */
const WEB_LABELS: Record<string, string> = {
  NO_ANSWER: 'Ne répond pas',
  REFUSED: 'Colis refusé',
  WRONG_ADDRESS: 'Adresse incorrecte',
  ABSENT: 'Destinataire absent',
  INCOMPLETE_ADDRESS: 'Adresse incomplète',
  PHONE_OFF: 'Téléphone éteint',
  OTHER: 'Autre raison',
  CANCELLED_BY_CLIENT: 'Annulé par client',
  NOT_INTERESTED_2ND_ATTEMPT: 'Client non intéressé',
  WRONG_NUMBER_2ND_ATTEMPT: 'Numéro incorrect',
  DUPLICATE_ORDER: 'Commande double',
  RETURN_CONFIRMED_BY_SENDER: "Retour confirmé par l'expéditeur",
  NON_COMPLIANT_ORDER: 'Commande non conforme',
  INCORRECT_AMOUNT: 'Montant incorrect',
  NOT_AVAILABLE_RESCHEDULED: 'Client non disponible (reporté)',
  UNRELIABLE_CLIENT: 'Client non sérieux',
  CALL_REFUSED: "Le client a refusé l'appel",
  LINE_BUSY: 'Ligne toujours occupée',
  WRONG_PAYMENT_MODE: 'Mode de paiement incorrect',
  PARCEL_POSTPONED: 'Colis reporté',
  FORCE_MAJEURE: 'Force majeure',
};

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

describe('failure reasons', () => {
  it('are exactly the backend’s 21 names', () => {
    expect(FAILURE_REASONS.map((r) => r.value).sort()).toEqual([...BACKEND_NAMES].sort());
  });

  it('offers 19: all but the two the business merged into "Annulé par client"', () => {
    const offered = reasonsFor(0).map((r) => r.value);
    expect(offered).toHaveLength(19);
    expect(offered).not.toContain('REFUSED');
    expect(offered).not.toContain('NOT_INTERESTED_2ND_ATTEMPT');
    // No count from the server means a first attempt.
    expect(reasonsFor(undefined).map((r) => r.value)).toEqual(offered);
    expect(reasonsFor(null).map((r) => r.value)).toEqual(offered);
  });

  it('hides "Colis refusé" and "Client non intéressé" on every attempt, like Android', () => {
    for (const attempts of [0, 1, 2, 3]) {
      const offered = reasonsFor(attempts).map((r) => r.value);
      expect(offered).toHaveLength(19);
      expect(offered).not.toContain('REFUSED');
      expect(offered).not.toContain('NOT_INTERESTED_2ND_ATTEMPT');
    }
  });

  it('offers "Annulé par client" instead, in the full list and in the quick one', () => {
    for (const attempts of [0, 1, 3]) {
      expect(reasonsFor(attempts).map((r) => r.value)).toContain('CANCELLED_BY_CLIENT');
      expect(commonReasonsFor(attempts).map((r) => r.value)).toContain('CANCELLED_BY_CLIENT');
    }
    expect(fr.enums.failureReason.CANCELLED_BY_CLIENT).toBe('Annulé par client');
  });

  it('still names the two hidden reasons on parcels recorded with them', () => {
    expect(fr.enums.failureReason.REFUSED).toBe('Colis refusé');
    expect(fr.enums.failureReason.NOT_INTERESTED_2ND_ATTEMPT).toBe('Client non intéressé');
  });

  it('keeps the quick list inside what the driver may pick, and without OTHER', () => {
    for (const attempts of [0, 2]) {
      const offered = reasonsFor(attempts).map((r) => r.value);
      for (const reason of commonReasonsFor(attempts)) {
        expect(offered).toContain(reason.value);
        expect(reasonNeedsNote(reason.value)).toBe(false);
      }
    }
  });

  it('has an English and a French label for every name', () => {
    for (const name of BACKEND_NAMES) {
      expect(en.enums.failureReason).toHaveProperty(name);
      expect(fr.enums.failureReason).toHaveProperty(name);
    }
  });

  it('uses the agency web app’s French labels', () => {
    expect(fr.enums.failureReason).toEqual(WEB_LABELS);
  });

  it('says nothing about after-sales cases: the hint was removed', () => {
    expect(fr.cantDeliver).not.toHaveProperty('savHint');
    expect(en.cantDeliver).not.toHaveProperty('savHint');
    for (const reason of FAILURE_REASONS) expect(reason).not.toHaveProperty('sav');
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
