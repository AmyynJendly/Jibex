import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { supports } from '../lib/platformSupport';
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
 * On iOS 18+ the stop zooms out of the card (Apple's zoom transition), and
 * swiping down shrinks it back in. Older iPhones, Android and web get a plain
 * press with the normal slide-in. (On web a Link would also render a real
 * `<a>`, which swallows the card's inner buttons and turns a drag into the
 * browser dragging the link.)
 */
export function StopLink({ jobId, scaleTo, style, children }: StopLinkProps) {
  const href = { pathname: '/job/[id]', params: { id: jobId } } as const;

  if (!supports.zoomTransition) {
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
