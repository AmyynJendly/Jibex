import { createPersistedToggle } from './persistedToggle';

const biometricLock = createPersistedToggle('jibex.biometricLock', true);

export const BiometricLockProvider = biometricLock.Provider;

/**
 * Whether the app asks for Face ID / Touch ID / the passcode when it opens
 * on a saved sign-in. On by default — the app shows cash totals and
 * customers' addresses. Off means straight in. Toggled in Profile.
 */
export const useBiometricLock = biometricLock.useToggle;

/** The saved choice, for the start-up gate, which runs before any screen has loaded it. */
export const readBiometricLock = biometricLock.read;
