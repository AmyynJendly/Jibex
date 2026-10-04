import { Alert, Platform } from 'react-native';

interface PromptOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Styles the confirm button as destructive where the platform can (iOS). */
  destructive?: boolean;
}

/**
 * Asks for a line of text — e.g. why a run is being refused. Resolves to
 * what was typed (possibly empty), or null when cancelled.
 *
 * iOS: the system alert with a text field (`Alert.prompt`), on every iOS
 * version. Web (the development preview): the browser's own prompt.
 * Android has no system text prompt in React Native, and Android isn't a
 * target of this app, so there it resolves to null.
 */
export function promptText({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
}: PromptOptions): Promise<string | null> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      Alert.prompt(
        title,
        message,
        [
          { text: cancelLabel, style: 'cancel', onPress: () => resolve(null) },
          {
            text: confirmLabel,
            style: destructive ? 'destructive' : 'default',
            onPress: (value?: string) => resolve(value ?? ''),
          },
        ],
        'plain-text'
      );
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.prompt(`${title}\n\n${message}`, ''));
  }
  return Promise.resolve(null);
}
