/**
 * "Client injoignable — continuer".
 *
 * The client's rule stays: Call must be pressed once before a parcel can be
 * marked delivered (the Android app has no such rule). This is the way on
 * for a call that went nowhere: offered only after a call, it notes the
 * customer couldn't be reached, and the note goes to the agency with a
 * failure.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { deliveryBlocker, unreachableStep } from '../lib/deliveryGate';
import { failureProofLine } from '../lib/failureProof';
import fr from '../lib/i18n/fr';

type Device = typeof import('../lib/deviceStore');

function freshDevice(): Device {
  let device!: Device;
  jest.isolateModules(() => {
    device = require('../lib/deviceStore');
  });
  return device;
}

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

describe('client injoignable', () => {
  it('is not offered before a call: the call rule comes first', () => {
    expect(unreachableStep({ callAttempts: 0, unreachable: false })).toBeNull();
    expect(deliveryBlocker({ callAttempts: 0, exchangeCollected: false })).toBe('statusUpdate.callRequired');
  });

  it('is offered once Call was pressed, and delivery is open', () => {
    expect(unreachableStep({ callAttempts: 1, unreachable: false })).toBe('offer');
    expect(deliveryBlocker({ callAttempts: 1, exchangeCollected: false })).toBeNull();
    expect(unreachableStep({ callAttempts: 2, unreachable: true })).toBe('noted');
  });

  it('cannot be noted without a call — it never stands in for one', async () => {
    const device = freshDevice();
    await device.hydrateDeviceStore();
    expect(await device.markUnreachable('TRK-1')).toBe(false);
    expect(device.isUnreachable('TRK-1')).toBe(false);
    expect(device.hasCalled('TRK-1')).toBe(false);
  });

  it('is noted after a call, per parcel, and survives a restart', async () => {
    const device = freshDevice();
    await device.hydrateDeviceStore();
    await device.recordCall('TRK-1');
    expect(await device.markUnreachable('TRK-1')).toBe(true);
    expect(device.isUnreachable('TRK-1')).toBe(true);
    expect(device.isUnreachable('TRK-2')).toBe(false);

    const relaunched = freshDevice();
    await relaunched.hydrateDeviceStore();
    expect(relaunched.isUnreachable('TRK-1')).toBe(true);
  });

  it('tells the agency, in French, next to the call times', () => {
    const now = new Date(2026, 9, 3, 15, 0, 0);
    const call = new Date(2026, 9, 3, 14, 32, 0).toISOString();
    expect(failureProofLine({ calls: [call], unreachable: true, now })).toBe(
      'Client appelé une fois (14:32). Client injoignable.'
    );
    expect(failureProofLine({ calls: [call], now })).toBe('Client appelé une fois (14:32).');
    // Never claimed without a call.
    expect(failureProofLine({ calls: [], unreachable: true, now })).toBe('Client non appelé.');
  });

  it('reads "Client injoignable — continuer"', () => {
    expect(fr.statusUpdate.unreachable).toBe('Client injoignable — continuer');
  });
});
