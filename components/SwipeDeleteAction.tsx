import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from './Icon';
import { useHapticsEnabled } from '../lib/haptics';

/** Width of the red action while the row rests half-open. */
export const DELETE_ACTION_WIDTH = 68;

/** How far across the screen a swipe has to travel to delete on release. */
const FULL_SWIPE_FRACTION = 0.5;

interface SwipeDeleteActionProps {
  /** The row's offset, straight from `ReanimatedSwipeable`'s `renderRightActions`. */
  translation: SharedValue<number>;
  color: string;
  radius: number;
  accessibilityLabel: string;
  onDelete: () => void;
  /** Whether a release right now would delete — the row reads it on release. */
  onArmedChange: (armed: boolean) => void;
}

/**
 * The red Delete behind a swiped row, working the way Mail's does: a short
 * swipe leaves it open to tap, a long one deletes on release.
 *
 * The red area stretches to fill whatever the row has uncovered, and past
 * the halfway mark the trash icon rides the row's edge with a single tick,
 * so the driver knows letting go now deletes.
 *
 * The stretching part is absolutely positioned inside a fixed-width slot, so
 * the swipeable still measures the action as 68pt wide and its own snapping
 * maths is left alone.
 */
export function SwipeDeleteAction({
  translation,
  color,
  radius,
  accessibilityLabel,
  onDelete,
  onArmedChange,
}: SwipeDeleteActionProps) {
  const { width } = useWindowDimensions();
  const { enabled: hapticsEnabled } = useHapticsEnabled();
  const armDistance = width * FULL_SWIPE_FRACTION;

  function handleArmed(armed: boolean) {
    onArmedChange(armed);
    if (armed && hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // Crossing the line is rare (twice per swipe at most), so hopping to the
  // RN runtime here is cheap — nothing runs per frame.
  useAnimatedReaction(
    () => -translation.get() > armDistance,
    (armed, previous) => {
      if (previous !== null && armed !== previous) scheduleOnRN(handleArmed, armed);
    }
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(DELETE_ACTION_WIDTH, -translation.get()),
  }));

  return (
    <View style={styles.slot}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color, borderRadius: radius }, fillStyle]}>
        <Pressable
          style={styles.press}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => {
            if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}>
          <Icon name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: DELETE_ACTION_WIDTH,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  // The icon sits at the leading edge, centered in the resting 68pt — so
  // when the red stretches, the icon travels with the row instead of
  // drifting to the middle of the screen.
  press: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: (DELETE_ACTION_WIDTH - 20) / 2,
  },
});
