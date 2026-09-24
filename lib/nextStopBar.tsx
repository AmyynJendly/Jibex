import { createPersistedToggle } from './persistedToggle';

const nextStopBar = createPersistedToggle('jibex.nextStopBarEnabled', true);

export const NextStopBarProvider = nextStopBar.Provider;

/** Whether the next-stop bar above the tabs (iOS 26+) is shown. Toggled in Profile. */
export const useNextStopBarEnabled = nextStopBar.useToggle;
