import type { NativeAlertsListProps } from './NativeAlertsList.types';

/**
 * The Mail-style alerts list is iOS-only (SwiftUI). Android and web keep the
 * Alerts screen's own cards, so nothing renders here.
 */
export function NativeAlertsList(_props: NativeAlertsListProps) {
  return null;
}
