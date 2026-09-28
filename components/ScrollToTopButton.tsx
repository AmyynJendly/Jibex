import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Spacing, useColors } from '../constants';
import { GlassIconButton } from './GlassIconButton';
import { Icon } from './Icon';

/** The arrow appears once the list has scrolled this share of a screen. */
const SHOW_AFTER_SCREENS = 0.6;

/**
 * Tracks whether a list has scrolled far enough to offer "back to top", and
 * where the top is. State only changes when the threshold is crossed, never
 * per frame.
 *
 * `floatingHeader`: the screen's bar floats over the list (large titles on
 * iOS). The list's real top is then above offset 0 by the bar's full
 * height, so scrolling to 0 would leave the large title collapsed. The bar's
 * height is read from navigation and its largest value kept — that's the
 * expanded bar, measured before any scrolling shrinks it.
 */
export function useScrollToTop({ floatingHeader = false }: { floatingHeader?: boolean } = {}) {
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const headerHeight = useHeaderHeight();
  // The largest height seen: the expanded bar. (Updated during render, the
  // way React recommends for a value derived from a changing prop.)
  const [expandedHeader, setExpandedHeader] = useState(headerHeight);
  if (headerHeight > expandedHeader) setExpandedHeader(headerHeight);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const next = contentOffset.y > layoutMeasurement.height * SHOW_AFTER_SCREENS;
    if (next !== shown.current) {
      shown.current = next;
      setVisible(next);
    }
  }, []);

  /** For when the list itself is swapped (Current / History): the new one starts at the top. */
  const reset = useCallback(() => {
    shown.current = false;
    setVisible(false);
  }, []);

  const floats = floatingHeader && Platform.OS === 'ios';
  return {
    visible,
    onScroll,
    reset,
    /** The offset that is the list's real top. */
    topOffset: floats ? -expandedHeader : 0,
    /** Pass to the list: lets it scroll above offset 0, to the top under a floating bar. */
    scrollToOverflowEnabled: floats,
  };
}

/** Rises and settles into place; never grows from nothing. */
const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 12 }, { scale: 0.9 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(220);
const EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  100: { opacity: 0, transform: [{ translateY: 8 }, { scale: 0.94 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(160);

/**
 * "Back to top": a small glass circle in the bottom-right corner — where iOS
 * 26 puts its own round glass buttons beside a tab bar that has shrunk on
 * scroll — carrying a kraft up-arrow. Liquid Glass on iOS 26, frosted glass
 * before that and elsewhere (see GlassSurface).
 *
 * `bottom`: how far up from the screen's bottom edge, to clear a tab bar or
 * a screen's own footer.
 */
export function ScrollToTopButton({
  visible,
  onPress,
  bottom,
}: {
  visible: boolean;
  onPress: () => void;
  bottom: number;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <Animated.View entering={ENTER} exiting={EXIT} style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <GlassIconButton size={46} accessibilityLabel={t('common.backToTop')} onPress={onPress}>
        <Icon name="arrow-up" size={20} color={colors.accent} />
      </GlassIconButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.xxl,
    borderRadius: 23,
    // A soft lift off the page, so the glass reads as floating above the list.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
