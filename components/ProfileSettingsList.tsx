import type { ProfileSettingsListProps } from './ProfileSettingsList.types';

/**
 * The native settings list is iOS-only (SwiftUI). Android and web keep the
 * Profile screen's own React Native rows, so nothing renders here.
 */
export function ProfileSettingsList(_props: ProfileSettingsListProps) {
  return null;
}
