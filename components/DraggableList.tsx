import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Gesture,
  GestureDetector,
  type PanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { Radii, Spacing, useColors } from '../constants';

/** Settling motion — quick enough to feel responsive, damped enough not to wobble. */
const SPRING = { damping: 22, stiffness: 260, mass: 0.6 } as const;

function buzz() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Browsers hand vertical drags to the scroller unless the target opts out. */
const handleWebStyle = Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null;

/** What a row needs to become draggable, handed to `renderItem`. */
export interface DragBinding {
  gesture: PanGesture;
  isActive: boolean;
}

/**
 * The grab affordance: six dots, the shape every list-reordering UI uses.
 * Small on purpose — it lives inside the card rather than stealing a column
 * beside it — with a touch target padded out well past its ink.
 */
export function DragHandle({ drag }: { drag: DragBinding }) {
  const colors = useColors();
  const color = drag.isActive ? colors.accent : colors.textTertiary;

  return (
    <GestureDetector gesture={drag.gesture}>
      <View
        accessibilityRole="adjustable"
        style={[
          handleStyles.target,
          handleWebStyle,
          drag.isActive && { backgroundColor: colors.accentSoft },
        ]}>
        <View style={handleStyles.dots}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[handleStyles.dot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const handleStyles = StyleSheet.create({
  target: {
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.xs,
  },
  dots: {
    width: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
});

/** Stacked offset of `id`, summing the heights of every row above it. */
function topOf(
  slots: Record<string, number>,
  heights: Record<string, number>,
  ids: string[],
  id: string
) {
  'worklet';
  const mine = slots[id] ?? 0;
  let top = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const other = ids[i];
    if ((slots[other] ?? 0) < mine) top += heights[other] ?? 0;
  }
  return top;
}

interface RowProps {
  id: string;
  slots: SharedValue<Record<string, number>>;
  heights: SharedValue<Record<string, number>>;
  ids: SharedValue<string[]>;
  activeId: SharedValue<string | null>;
  dragY: SharedValue<number>;
  /** Absolute placement only kicks in once every row has reported its height. */
  positioned: boolean;
  lifted: boolean;
  onMeasure: (id: string, height: number) => void;
  children: ReactNode;
}

function Row({
  id,
  slots,
  heights,
  ids,
  activeId,
  dragY,
  positioned,
  lifted,
  onMeasure,
  children,
}: RowProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!positioned) return {};
    const isActive = activeId.value === id;
    const target = topOf(slots.value, heights.value, ids.value, id);
    return {
      // The dragged row follows the finger outright; everyone else springs
      // toward the slot they now occupy.
      transform: [{ translateY: isActive ? dragY.value : withSpring(target, SPRING) }],
    };
  }, [positioned, id]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onMeasure(id, event.nativeEvent.layout.height),
    [id, onMeasure]
  );

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        positioned ? styles.rowPositioned : styles.rowFlow,
        lifted && styles.lifted,
        animatedStyle,
      ]}>
      {children}
    </Animated.View>
  );
}

interface DraggableListProps<T> {
  data: T[];
  idOf: (item: T) => string;
  /**
   * `index` is the row's live position in the driver's order, not in `data`.
   * Spread `drag` onto a handle (usually via `DragHandle`) to make the row
   * draggable; omit it and the row stays put.
   */
  renderItem: (item: T, index: number, drag: DragBinding) => ReactNode;
  /** Fires with the new id order once a drag settles. */
  onReorder: (orderedIds: string[]) => void;
  /**
   * Fires when a drag starts and ends. Parents must use it to switch off
   * their ScrollView — otherwise the scroller and the drag both follow the
   * finger and the row slides away under it.
   */
  onDragStateChange?: (dragging: boolean) => void;
}

/**
 * Hold-and-drag reorder list. Drivers sort their sheet by hand on paper, so
 * this mirrors that: grab the handle on a card, drag up or down, and the new
 * order sticks.
 *
 * Two decisions account for how this feels.
 *
 * **Nothing re-renders mid-drag.** Slot assignments live in a Reanimated
 * shared value, so re-slotting updates positions on the UI thread and React
 * is left out of it entirely until the finger lifts. The earlier version set
 * React state on every swap, which re-rendered every card mid-gesture — the
 * source of the stutter. Only two renders happen now: one on grab, one on
 * release.
 *
 * **Rows are measured, never assumed.** Heights come from `onLayout`, so a
 * card that grows — a longer address, a larger accessibility font, an
 * expanded section — is positioned correctly instead of being clipped by a
 * hardcoded row pitch. Until every row has reported in, the list renders in
 * normal flow, which is already the right layout; the switch to absolute
 * positioning is therefore invisible.
 *
 * **The gesture itself runs on the UI thread too.** `Gesture.Pan` callbacks
 * are worklets, so a finger movement never waits on JavaScript to be free —
 * the earlier `PanResponder` version routed every move through the JS thread,
 * which is fine until the app is doing anything else. JS is touched only for
 * the things that genuinely need it: haptics, and committing the new order.
 */
export function DraggableList<T>({
  data,
  idOf,
  renderItem,
  onReorder,
  onDragStateChange,
}: DraggableListProps<T>) {
  const ids = useMemo(() => data.map(idOf), [data, idOf]);
  const idKey = ids.join('|');

  /** Committed order — only changes when a drag settles or `data` changes. */
  const [order, setOrder] = useState<string[]>(ids);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);
  const [positioned, setPositioned] = useState(false);

  const slots = useSharedValue<Record<string, number>>({});
  const heights = useSharedValue<Record<string, number>>({});
  const idsSV = useSharedValue<string[]>(ids);
  const activeIdSV = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);

  const dragStateRef = useRef(onDragStateChange);
  dragStateRef.current = onDragStateChange;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const seededKey = useRef<string | null>(null);
  const orderRef = useRef(order);

  // Re-seat when the underlying list changes (a parcel delivered and dropped
  // out, or a new one assigned), preserving the driver's existing order for
  // everything that's still there.
  if (seededKey.current !== idKey) {
    seededKey.current = idKey;
    const kept = orderRef.current.filter((id) => ids.includes(id));
    const next = [...kept, ...ids.filter((id) => !kept.includes(id))];
    orderRef.current = next;
    idsSV.value = next;
    slots.value = Object.fromEntries(next.map((id, i) => [id, i]));
    // Heights of departed rows would otherwise keep padding the stack.
    const kentHeights: Record<string, number> = {};
    next.forEach((id) => {
      if (heights.value[id] !== undefined) kentHeights[id] = heights.value[id];
    });
    heights.value = kentHeights;
    if (next.length !== order.length || next.some((id, i) => id !== order[i])) {
      setOrder(next);
    }
    if (next.some((id) => kentHeights[id] === undefined)) setPositioned(false);
  }

  const handleMeasure = useCallback(
    (id: string, height: number) => {
      const rounded = Math.round(height);
      if (rounded <= 0 || Math.abs((heights.value[id] ?? 0) - rounded) < 0.5) return;
      heights.value = { ...heights.value, [id]: rounded };

      const all = orderRef.current;
      if (all.every((rowId) => heights.value[rowId] !== undefined)) {
        setTotalHeight(all.reduce((sum, rowId) => sum + (heights.value[rowId] ?? 0), 0));
        setPositioned(true);
      }
    },
    [heights]
  );

  /** Committed from a worklet once the finger lifts. */
  const commitOrder = useCallback((settled: string[], moved: boolean) => {
    if (!moved) return;
    orderRef.current = settled;
    setOrder(settled);
    onReorderRef.current(settled);
  }, []);

  const startDrag = useCallback((id: string) => {
    setActiveId(id);
    dragStateRef.current?.(true);
    buzz();
  }, []);

  const endDrag = useCallback(() => {
    setActiveId(null);
    dragStateRef.current?.(false);
  }, []);

  const grantTop = useSharedValue(0);
  /**
   * Translation already accumulated when the pan activated. Gesture handler
   * measures `translationY` from the touch-down point, but only starts
   * reporting once the activation threshold is crossed — without subtracting
   * that head start the card sits a few millimetres behind the finger for the
   * whole drag.
   */
  const startOffset = useSharedValue(0);
  const moved = useSharedValue(false);
  const gestures = useRef(new Map<string, PanGesture>()).current;

  function gestureFor(id: string) {
    const existing = gestures.get(id);
    if (existing) return existing;

    const created = Gesture.Pan()
      // The handle is a dedicated target, so the drag starts on contact
      // rather than after a hold, and keeps the finger even past the edge.
      .shouldCancelWhenOutside(false)
      // A few pixels of vertical intent before this takes the finger, so a
      // tap that grazes the handle doesn't start a drag.
      .activeOffsetY([-6, 6])
      .onStart((event) => {
        'worklet';
        const top = topOf(slots.value, heights.value, idsSV.value, id);
        grantTop.value = top;
        startOffset.value = event.translationY;
        dragY.value = top;
        activeIdSV.value = id;
        moved.value = false;
        runOnJS(startDrag)(id);
      })
      .onUpdate((event) => {
        'worklet';
        const draggedTop = grantTop.value + (event.translationY - startOffset.value);
        dragY.value = draggedTop;

        // Where this row now belongs among the others. Inserting at slot k
        // puts its top at the k-th other's stacked offset, so compare the
        // dragged *top* against their midpoints and take the last slot it
        // has cleared.
        const current = slots.value;
        const ordered = [...idsSV.value].sort((a, b) => (current[a] ?? 0) - (current[b] ?? 0));
        const others = ordered.filter((other) => other !== id);
        let accumulated = 0;
        let target = 0;
        for (let i = 0; i < others.length; i += 1) {
          const height = heights.value[others[i]] ?? 0;
          if (draggedTop <= accumulated + height / 2) break;
          accumulated += height;
          target += 1;
        }

        if ((current[id] ?? 0) === target) return;
        const next = [...others];
        next.splice(target, 0, id);
        const remapped: Record<string, number> = {};
        for (let i = 0; i < next.length; i += 1) remapped[next[i]] = i;
        slots.value = remapped;
        moved.value = true;
        runOnJS(buzz)();
      })
      .onEnd(() => {
        'worklet';
        const current = slots.value;
        const settled = [...idsSV.value].sort((a, b) => (current[a] ?? 0) - (current[b] ?? 0));
        // Settle into the slot, then hand back to slot-based positioning.
        dragY.value = withSpring(topOf(current, heights.value, idsSV.value, id), SPRING);
        runOnJS(commitOrder)(settled, moved.value);
      })
      // Always runs — including on cancellation — so the lifted state can't stick.
      .onFinalize(() => {
        'worklet';
        activeIdSV.value = null;
        runOnJS(endDrag)();
      });

    gestures.set(id, created);
    return created;
  }

  const byId = useMemo(() => new Map(data.map((item) => [idOf(item), item] as const)), [data, idOf]);

  return (
    <View style={positioned ? { height: totalHeight } : undefined}>
      {order.map((id, slot) => {
        const item = byId.get(id);
        if (!item) return null;
        const isActive = activeId === id;
        return (
          <Row
            key={id}
            id={id}
            slots={slots}
            heights={heights}
            ids={idsSV}
            activeId={activeIdSV}
            dragY={dragY}
            positioned={positioned}
            lifted={isActive}
            onMeasure={handleMeasure}>
            {renderItem(item, slot, { gesture: gestureFor(id), isActive })}
          </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowFlow: {
    paddingBottom: Spacing.md,
  },
  rowPositioned: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingBottom: Spacing.md,
  },
  lifted: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 8,
  },
});
