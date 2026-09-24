import { createPersistedToggle } from './persistedToggle';

const haptics = createPersistedToggle('jibex.hapticsEnabled', true);

export const HapticsProvider = haptics.Provider;

/**
 * Whether `AnimatedPressable` should fire tactile feedback.
 *
 * Read by every pressable in the app, so this stays a plain boolean rather
 * than something a driver has to reconfigure per screen — one switch in
 * Profile, respected everywhere. Defaults on for the reason `AnimatedPressable`
 * itself defaults its `haptic` prop on: the app had no touch feedback at all
 * before, and that read as inert. Off is for the driver who finds it too much
 * once they've felt it.
 */
export const useHapticsEnabled = haptics.useToggle;
