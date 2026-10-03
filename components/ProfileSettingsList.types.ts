import type { ReactNode } from 'react';

export interface ProfileSettingsListProps {
  /** Driver card and stats, shown at the top of the list. */
  header: ReactNode;
  labels: {
    language: string;
    security: string;
    biometric: string;
    changePassword: string;
    haptics: string;
    nextStopBar: string;
    support: string;
    helpCenter: string;
    appVersion: string;
    logOut: string;
  };
  languages: { value: string; label: string }[];
  language: string;
  onLanguageChange: (language: string) => void;
  biometric: boolean;
  onBiometricChange: (on: boolean) => void;
  haptics: boolean;
  onHapticsChange: (on: boolean) => void;
  /** `null` hides the row — on iPhones that can't show the bar. */
  nextStopBar: boolean | null;
  onNextStopBarChange: (on: boolean) => void;
  appVersion: string;
  onOpenHelpCenter: () => void;
  onChangePassword: () => void;
  onLogOut: () => void;
}
