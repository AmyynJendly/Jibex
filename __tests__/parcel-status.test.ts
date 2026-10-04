/**
 * Every parcel status the server can send: what the app counts it as, and
 * the words shown for it.
 *
 * The list is the agency web app's full status list plus IN_WAREHOUSE (sent
 * only by its Dépôt page). Every code must map to a state and have a label.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { i18next } from '../lib/i18n';
import { PARCEL_STATUS_CODES, jobStatusOfParcel, notableParcelStatus, parcelStatusLabel } from '../lib/parcelStatus';
import { toJobStatusFromParcel } from '../services/real-api';

/** The web app's list (27 codes) plus IN_WAREHOUSE. */
const EVERY_CODE = [
  'CREATED', 'PENDING', 'A_ENLEVER', 'PICKUP', 'PICKED_UP', 'SCANNED', 'A_VERIFIER',
  'AU_DEPOT', 'AU_DEPOT_RELAIS', 'AU_DEPOT_DESTINATION', 'EN_TRANSIT_AGENCE', 'IN_TRANSIT',
  'EN_COURS', 'OUT_FOR_DELIVERY', 'DELAYED', 'DELIVERED', 'LIVRE_PAYE', 'RTN_DEPOT',
  'RETOUR_A_CHARGER', 'EN_TRANSIT_RETOUR', 'RETOUR_CLIENT_AGENCE', 'RETOUR_EXPEDITEUR',
  'RETOUR_RECU', 'RETOUR_DEFINITIF', 'RETURNED', 'CANCELLED', 'LOST', 'IN_WAREHOUSE',
];

describe('parcel statuses', () => {
  it('knows the full list, no more and no less', () => {
    expect([...PARCEL_STATUS_CODES].sort()).toEqual([...EVERY_CODE].sort());
  });

  it.each(EVERY_CODE)('%s maps to one of our four states', (code) => {
    expect(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED']).toContain(jobStatusOfParcel(code));
    // The server mapper answers from the same table.
    expect(toJobStatusFromParcel(code)).toBe(jobStatusOfParcel(code));
  });

  it('counts DELAYED and IN_WAREHOUSE as in transit', () => {
    expect(jobStatusOfParcel('DELAYED')).toBe('IN_TRANSIT');
    expect(jobStatusOfParcel('IN_WAREHOUSE')).toBe('IN_TRANSIT');
  });

  it('answers null for a code it has never seen, rather than guessing', () => {
    expect(jobStatusOfParcel('SOMETHING_NEW')).toBeNull();
    expect(jobStatusOfParcel(null)).toBeNull();
    expect(jobStatusOfParcel(undefined)).toBeNull();
  });

  it.each(EVERY_CODE)('%s has its own label in French and in English', (code) => {
    for (const language of ['fr', 'en']) {
      // Exists as a real entry, not the readable fallback built from the code.
      expect(i18next.exists(`enums.parcelStatus.${code}`, { lng: language })).toBe(true);
      expect(parcelStatusLabel(i18next.getFixedT(language), code)).not.toMatch(/_/);
    }
  });

  it('uses the agency’s words in French', () => {
    const t = i18next.getFixedT('fr');
    expect(parcelStatusLabel(t, 'A_VERIFIER')).toBe('À vérifier (SAV)');
    expect(parcelStatusLabel(t, 'AU_DEPOT_RELAIS')).toBe('Au dépôt relais');
    expect(parcelStatusLabel(t, 'EN_TRANSIT_AGENCE')).toBe('En transit (transfert)');
    expect(parcelStatusLabel(t, 'RTN_DEPOT')).toBe('Retour dépôt');
    expect(parcelStatusLabel(t, 'LIVRE_PAYE')).toBe('Livré & Payé');
  });

  it('shows an unknown code readable, never raw', () => {
    expect(parcelStatusLabel(i18next.getFixedT('fr'), 'SOMETHING_NEW')).toBe('Something new');
  });

  it('only adds the parcel status to a card when it says more than the ribbon', () => {
    expect(notableParcelStatus('EN_COURS')).toBeUndefined();
    expect(notableParcelStatus('DELIVERED')).toBeUndefined();
    expect(notableParcelStatus(undefined)).toBeUndefined();
    expect(notableParcelStatus('A_VERIFIER')).toBe('A_VERIFIER');
    expect(notableParcelStatus('RTN_DEPOT')).toBe('RTN_DEPOT');
    expect(notableParcelStatus('AU_DEPOT_RELAIS')).toBe('AU_DEPOT_RELAIS');
  });
});
