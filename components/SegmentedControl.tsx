import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Fonts, Spacing, Spring, Typography, useColors } from '../constants';
import { GlassSurface } from './GlassSurface';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

const PADDING = 4;
const GAP = Spacing.sm;

/**
 * The glass pill switcher used for list filters (Scheduled/Completed,
 * All/Pending/Delivered, ...).
 *
 * The selected highlight is one element that slides between positions rather
 * than a highlight rendered inside whichever segment happens to be active.
 * The old version simply appeared in the new slot, which is the difference
 * between a control that responds and one that just redraws — and this is a
 * control drivers hit constantly, so it's worth the spring.
 *
 * The slide is an absolutely positioned, childless element, so animating it
 * costs no layout pass; `translateX` on the UI thread never touches React.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const settled = useRef(false);
  const offset = useSharedValue(0);

  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value)
  );
  const segmentWidth =
    width > 0 ? (width - PADDING * 2 - GAP * (segments.length - 1)) / segments.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = PADDING + index * (segmentWidth + GAP);
    // Jump into place on the first measurement — animating from zero would
    // make the highlight fly in from the left every time a screen mounts.
    if (settled.current) {
      offset.set(withSpring(target, Spring.settle));
    } else {
      offset.set(target);
      settled.current = true;
    }
  }, [index, segmentWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <GlassSurface style={styles.wrapper} onLayout={handleLayout}>
      {segmentWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}>
          <GlassSurface
            style={StyleSheet.absoluteFill}
            tintColor={colors.accent}
            tintOpacity={0.42}
            glassEffectStyle="regular"
            isInteractive
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            locations={[0, 0.6]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => {
              if (!active) Haptics.selectionAsync();
              onChange(segment.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segment}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                Typography.subhead,
                {
                  color: active ? '#fff' : colors.textSecondary,
                  fontFamily: active ? Fonts.archivoBold : Fonts.archivoSemiBold,
                },
              ]}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: GAP,
    borderRadius: 14,
    padding: PADDING,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
