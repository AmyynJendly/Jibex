import type { NativeEmptyStateProps } from './NativeEmptyState.types';

/** Apple's empty-state view is iOS-only; `EmptyState` draws its own tile elsewhere. */
export function NativeEmptyState(_props: NativeEmptyStateProps) {
  return null;
}
