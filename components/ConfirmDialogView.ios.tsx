import { Host } from '@expo/ui';
import { Alert, Button, Text } from '@expo/ui/swift-ui';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { ConfirmDialogViewProps } from './ConfirmDialog.types';

/**
 * The system alert (SwiftUI `alert`), centred on screen on every iOS version.
 *
 * Not `confirmationDialog`: on recent iOS that renders as a popover pinned to
 * the view it's attached to, and with no on-screen button to attach to here
 * it appeared from a corner, easy to miss. A destructive confirm is drawn in
 * red, the platform's signal that it can't be undone.
 */
export function ConfirmDialogView({ options, onResolve }: ConfirmDialogViewProps) {
  // Keeps the text on screen while the alert animates away after an answer.
  const [shown, setShown] = useState(options);
  if (options && options !== shown) setShown(options);
  const content = options ?? shown;

  return (
    <Host style={styles.anchor} pointerEvents="none">
      <Alert
        title={content?.title ?? ''}
        isPresented={!!options}
        onIsPresentedChange={(presented) => {
          if (!presented) onResolve(false);
        }}>
        <Alert.Trigger>
          <Text>{''}</Text>
        </Alert.Trigger>
        <Alert.Actions>
          <Button label={content?.cancelLabel ?? ''} role="cancel" onPress={() => onResolve(false)} />
          <Button
            label={content?.confirmLabel ?? ''}
            role={content?.destructive ? 'destructive' : 'default'}
            onPress={() => onResolve(true)}
          />
        </Alert.Actions>
        {content?.message ? (
          <Alert.Message>
            <Text>{content.message}</Text>
          </Alert.Message>
        ) : null}
      </Alert>
    </Host>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
});
