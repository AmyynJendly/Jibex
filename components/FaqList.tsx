import type { FaqListProps } from './FaqList.types';

/**
 * The native FAQ list is iOS-only (SwiftUI). Android and web keep the Help
 * Center's own expanding cards, so nothing renders here.
 */
export function FaqList(_props: FaqListProps) {
  return null;
}
