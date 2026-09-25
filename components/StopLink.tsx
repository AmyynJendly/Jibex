import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supports } from '../lib/platformSupport';
import { callCustomer, openInMaps } from '../lib/stopActions';
import type { Job } from '../types';
import { AnimatedPressable } from './AnimatedPressable';

interface StopLinkProps {
  job: Job;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * A card that opens a stop's screen, with extras layered on by what the phone
 * supports (see `lib/platformSupport`):
 *
 * - iOS: long-press shows a live preview of the stop with Call, Navigate and
 *   Can't deliver underneath — the same peek-and-act as Messages or Photos.
 *   Those actions all stay on the stop screen too; the menu is a shortcut.
 * - iOS 18+: tapping zooms the stop out of the card, and swiping down shrinks
 *   it back in. Older iPhones get the normal slide-in.
 * - Android and web: a plain press. (On web a Link would render a real `<a>`,
 *   which swallows the card's inner buttons and turns a drag into the browser
 *   dragging the link.)
 */
export function StopLink({ job, scaleTo, style, children }: StopLinkProps) {
  const { t } = useTranslation();
  const href = { pathname: '/job/[id]', params: { id: job.id } } as const;

  if (!supports.linkPreview) {
    return (
      <AnimatedPressable scaleTo={scaleTo} style={style} onPress={() => router.push(href)}>
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Link href={href} asChild>
      <Link.Trigger withAppleZoom={supports.zoomTransition}>
        {/* Link's asChild slot merges styles and only accepts a single object. */}
        <AnimatedPressable scaleTo={scaleTo} style={StyleSheet.flatten(style)}>
          {children}
        </AnimatedPressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction icon="phone" onPress={() => callCustomer(job)}>
          {t('runsheets.call')}
        </Link.MenuAction>
        <Link.MenuAction
          icon="arrow.triangle.turn.up.right.diamond"
          onPress={() => openInMaps(job)}>
          {t('jobDetail.navigate')}
        </Link.MenuAction>
        <Link.MenuAction
          icon="xmark.circle"
          onPress={() =>
            router.push({ pathname: '/job/[id]/cant-deliver', params: { id: job.id } })
          }>
          {t('jobDetail.cantDeliver')}
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}
