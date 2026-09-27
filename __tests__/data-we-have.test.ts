/**
 * Using data the app already has: the city in a pickup address, and the
 * proof line added to a failed delivery's notes.
 */
import { failureNotes, failureProofLine } from '../lib/failureProof';
import { governorateIn } from '../lib/governorates';
import { i18next } from '../lib/i18n';

describe('the city in a free-text address', () => {
  it('finds a governorate as a whole word, ignoring case and accents', () => {
    expect(governorateIn('12 rue de la Liberté, sfax')).toBe('Sfax');
    expect(governorateIn('Route de Gabes km 4')).toBe('Gabès');
    expect(governorateIn('Cité Ennasr, BEN AROUS')).toBe('Ben Arous');
    expect(governorateIn('Av. Bourguiba, Sidi Bouzid')).toBe('Sidi Bouzid');
    expect(governorateIn('El Kef centre')).toBe('Le Kef');
  });

  it('finds nothing in an address that names no governorate', () => {
    // The live test pickups: "tt1".
    expect(governorateIn('tt1')).toBeUndefined();
    expect(governorateIn('Sfaxien Market')).toBeUndefined();
    expect(governorateIn(null)).toBeUndefined();
  });
});

describe('proof in a failed delivery’s notes', () => {
  const t = i18next.getFixedT('en');
  const now = new Date(2026, 8, 27, 11, 0);
  const at = (h: number, m: number, day = 27) => new Date(2026, 8, day, h, m).toISOString();

  it('lists the calls with their times, like the agency asked', () => {
    expect(failureProofLine(t, { calls: [at(10, 2), at(10, 15), at(10, 31)], now })).toBe(
      'Called 3 times (10:02, 10:15, 10:31).'
    );
    expect(failureProofLine(t, { calls: [at(9, 5)], now })).toBe('Called once (09:05).');
  });

  it('says so when there was no call, and adds the location when there is one', () => {
    expect(failureProofLine(t, { calls: [], location: { lat: 36.8001234, lng: 10.18 }, now })).toBe(
      'Not called. Location: 36.80012, 10.18000.'
    );
  });

  it('stays short: the last five times, and a date for calls on another day', () => {
    const calls = [at(8, 0, 26), at(9, 0), at(9, 10), at(9, 20), at(9, 30), at(9, 40)];
    expect(failureProofLine(t, { calls, now })).toBe('Called 6 times (…, 09:00, 09:10, 09:20, 09:30, 09:40).');
    expect(failureProofLine(t, { calls: [at(18, 45, 26)], now })).toBe('Called once (26/09 18:45).');
  });

  it('is written in French when the app is', () => {
    const fr = i18next.getFixedT('fr');
    expect(failureProofLine(fr, { calls: [at(10, 2), at(10, 15)], location: { lat: 36.8, lng: 10.18 }, now })).toBe(
      'Appelé 2 fois (10:02, 10:15). Position : 36.80000, 10.18000.'
    );
  });

  it('keeps the driver’s own note first', () => {
    expect(failureNotes('  Portail fermé ', 'Not called.')).toBe('Portail fermé\nNot called.');
    expect(failureNotes(undefined, 'Not called.')).toBe('Not called.');
  });
});
