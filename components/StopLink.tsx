import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';

interface StopLinkProps {
  jobId: string;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * A card that opens a stop's screen.
 *
 * On iOS the stop zooms out of the card (Apple's zoom transition, iOS 18+),
 * and swiping down shrinks it back in. Elsewhere it's a plain press: on web a
 * Link renders a real `<a>`, which swallows the card's inner buttons and
 * turns a drag into the browser dragging the link — and there's no zoom to
 * gain there anyway.
 */
export function StopLink({ jobId, scaleTo, style, children }: StopLinkProps) {
  const href = { pathname: '/job/[id]', params: { id: jobId } } as const;

  if (Platform.OS !== 'ios') {
    return (
      <AnimatedPressable scaleTo={scaleTo} style={style} onPress={() => router.push(href)}>
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Link href={href} asChild>
      <Link.Trigger withAppleZoom>
        {/* Link's asChild slot merges styles and only accepts a single object. */}
        <AnimatedPressable scaleTo={scaleTo} style={StyleSheet.flatten(style)}>
          {children}
        </AnimatedPressable>
      </Link.Trigger>
    </Link>
  );
}
