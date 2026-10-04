/**
 * Exchange parcels. In the live test an exchange looked like any other
 * parcel in the app: nothing told the driver to take an article back. The
 * server only carries a flag, so the check is done on the phone.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { deliveryBlocker } from '../lib/deliveryGate';
import fr from '../lib/i18n/fr';
import { toJob } from '../services/real-api';

describe('exchange parcels', () => {
  it('are recognised from the server’s exchange flag', () => {
    expect(toJob({ id: 130, trackingNumber: 'TUN-100-01B70C0B', exchange: true }).exchange).toBe(true);
    expect(toJob({ id: 1, trackingNumber: 'X', exchange: false }).exchange).toBeUndefined();
    expect(toJob({ id: 1, trackingNumber: 'X' }).exchange).toBeUndefined();
  });

  it('can’t be marked delivered until the driver has ticked "J’ai récupéré l’article"', () => {
    expect(deliveryBlocker({ callAttempts: 1, exchange: true, exchangeCollected: false })).toBe('exchange.required');
    expect(deliveryBlocker({ callAttempts: 1, exchange: true, exchangeCollected: true })).toBeNull();
  });

  it('leaves ordinary parcels alone', () => {
    expect(deliveryBlocker({ callAttempts: 1, exchangeCollected: false })).toBeNull();
    expect(deliveryBlocker({ callAttempts: 2, exchange: false, exchangeCollected: false })).toBeNull();
  });

  it('still asks for the call first, exchange or not', () => {
    expect(deliveryBlocker({ callAttempts: 0, exchangeCollected: false })).toBe('statusUpdate.callRequired');
    expect(deliveryBlocker({ callAttempts: 0, exchange: true, exchangeCollected: true })).toBe(
      'statusUpdate.callRequired'
    );
  });

  it('says it in the agency’s French', () => {
    expect(fr.exchange.badge).toBe('ÉCHANGE');
    expect(fr.exchange.instruction).toBe('Récupérer l’article à retourner à l’expéditeur');
    expect(fr.exchange.checkbox).toBe('J’ai récupéré l’article');
  });
});
