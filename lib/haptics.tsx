import { createPersistedToggle } from './persistedToggle';

const haptics = createPersistedToggle('jibex.hapticsEnabled', true);

export const HapticsProvider = haptics.Provider;

/**
 * Whether `AnimatedPressable` should fire tactile feedback.
 *
 * Read by every pressable in the app: one switch in Profile, respected
 * everywhere. On by default, because without touch feedback the app reads
 * as inert; off is for the driver who finds it too much.
 */
export const useHapticsEnabled = haptics.useToggle;
