import { Host } from '@expo/ui';
import { Button, ConfirmationDialog, Text } from '@expo/ui/swift-ui';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { ConfirmDialogViewProps } from './ConfirmDialog.types';

/**
 * The system confirmation dialog (SwiftUI `confirmationDialog`): slides up
 * from the bottom, confirm on top, Cancel set apart below it. A destructive
 * confirm is drawn in red, the platform's signal that it can't be undone.
 */
export function ConfirmDialogView({ options, onResolve }: ConfirmDialogViewProps) {
  // Keeps the text on screen while the dialog animates away after an answer.
  const [shown, setShown] = useState(options);
  if (options && options !== shown) setShown(options);
  const content = options ?? shown;

  return (
    <Host style={styles.anchor} pointerEvents="none">
      <ConfirmationDialog
        title={content?.title ?? ''}
        titleVisibility="visible"
        isPresented={!!options}
        onIsPresentedChange={(presented) => {
          if (!presented) onResolve(false);
        }}>
        <ConfirmationDialog.Trigger>
          <Text>{''}</Text>
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button
            label={content?.confirmLabel ?? ''}
            role={content?.destructive ? 'destructive' : 'default'}
            onPress={() => onResolve(true)}
          />
          <Button label={content?.cancelLabel ?? ''} role="cancel" onPress={() => onResolve(false)} />
        </ConfirmationDialog.Actions>
        {content?.message ? (
          <ConfirmationDialog.Message>
            <Text>{content.message}</Text>
          </ConfirmationDialog.Message>
        ) : null}
      </ConfirmationDialog>
    </Host>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
});
