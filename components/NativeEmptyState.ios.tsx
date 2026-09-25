import { Host } from '@expo/ui';
import { ContentUnavailableView } from '@expo/ui/swift-ui';
import { StyleSheet } from 'react-native';

import type { NativeEmptyStateProps } from './NativeEmptyState.types';

/**
 * Apple's `ContentUnavailableView` (iOS 17+): the system's own "nothing
 * here" layout, with its icon, title and description in the system style.
 * Callers check `supports.contentUnavailableView` first.
 */
export function NativeEmptyState({ systemImage, title, description }: NativeEmptyStateProps) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.host}>
      <ContentUnavailableView systemImage={systemImage} title={title} description={description} />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'stretch' },
});
