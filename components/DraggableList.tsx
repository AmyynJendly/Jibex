import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type GestureResponderHandlers,
} from 'react-native';

import { Radii, Spacing, useColors } from '../constants';

function buzz() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Browsers hand vertical drags to the scroller unless the target opts out. */
const handleWebStyle = Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null;

/** What a row needs to become draggable, handed to `renderItem`. */
export interface DragBinding {
  handlers: GestureResponderHandlers;
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
    <View
      accessibilityRole="adjustable"
      style={[
        handleStyles.target,
        handleWebStyle,
        drag.isActive && { backgroundColor: colors.accentSoft },
      ]}
      {...drag.handlers}>
      <View style={handleStyles.dots}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[handleStyles.dot, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

const handleStyles = StyleSheet.create({
  target: {
    width: 26,
    height: 30,
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

interface DraggableListProps<T> {
  data: T[];
  idOf: (item: T) => string;
  /**
   * Row pitch, including the gap beneath it. Pass a function when rows can
   * differ — an expanded card, say — and the list lays out from cumulative
   * offsets instead of a single stride.
   */
  itemHeight: number | ((item: T) => number);
  /**
   * `index` is the row's live position in the driver's order, not in `data`.
   * Spread `drag` onto a handle (usually via `DragHandle`) to make the row
   * draggable; omit it and the row stays put.
   */
  renderItem: (item: T, index: number, drag: DragBinding) => React.ReactNode;
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
 * Built on core `PanResponder` rather than react-native-gesture-handler: the
 * gesture lives only on the small handle, and PanResponder behaves identically
 * on device and in the browser (RNGH's web layer does not).
 *
 * Three details keep the motion honest. Responders are built once per row id
 * and read live state through refs — rebuilding them mid-gesture used to hand
 * the drag stale indices. The dragged row is positioned from where the finger
 * actually is rather than from its slot, so re-slotting mid-drag can't make it
 * jump. And displaced rows animate with a FLIP: their slot changes instantly,
 * then they're offset back to where they were and sprung to zero, so they
 * slide instead of teleporting.
 */
export function DraggableList<T>({
  data,
  idOf,
  itemHeight,
  renderItem,
  onReorder,
  onDragStateChange,
}: DraggableListProps<T>) {
  const ids = useMemo(() => data.map(idOf), [data, idOf]);
  // Identity of the incoming set, so re-seeding keys off what actually
  // changed rather than off a fresh array reference every render.
  const idKey = ids.join('|');

  const [order, setOrder] = useState<string[]>(ids);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Live mirrors for the PanResponder closures, which outlive any single render.
  const orderRef = useRef(order);
  const activeIdRef = useRef<string | null>(null);
  const dragStateRef = useRef(onDragStateChange);
  dragStateRef.current = onDragStateChange;

  const dragY = useRef(new Animated.Value(0)).current;
  /** Where the dragged row's top sat when the finger went down. */
  const grantTop = useRef(0);
  const didMove = useRef(false);

  /** Per-row offset used only for the slide-into-place animation. */
  const offsets = useRef(new Map<string, Animated.Value>()).current;
  const prevTops = useRef(new Map<string, number>()).current;
  const seededKey = useRef<string | null>(null);

  function offsetFor(id: string) {
    let value = offsets.get(id);
    if (!value) {
      value = new Animated.Value(0);
      offsets.set(id, value);
    }
    return value;
  }

  // Re-seat when the underlying list changes (a parcel delivered and dropped
  // out, or a new one assigned), preserving the driver's existing order for
  // everything that's still there.
  if (seededKey.current !== idKey) {
    seededKey.current = idKey;
    const kept = orderRef.current.filter((id) => ids.includes(id));
    const next = [...kept, ...ids.filter((id) => !kept.includes(id))];
    const unchanged = next.length === order.length && next.every((id, i) => id === order[i]);
    if (!unchanged) {
      orderRef.current = next;
      // Rows arriving or leaving shouldn't trigger the slide animation —
      // there's no previous position to slide from.
      prevTops.clear();
      setOrder(next);
    }
  }

  const byId = useMemo(() => new Map(data.map((item) => [idOf(item), item] as const)), [data, idOf]);

  const heightOf = (id: string) => {
    const item = byId.get(id);
    if (!item) return 0;
    return typeof itemHeight === 'function' ? itemHeight(item) : itemHeight;
  };

  // Cumulative layout, recomputed each render and mirrored into a ref so the
  // gesture handlers can measure without waiting for a re-render.
  const layout = useMemo(() => {
    const heights = new Map<string, number>();
    const tops = new Map<string, number>();
    let total = 0;
    for (const id of order) {
      const height = heightOf(id);
      heights.set(id, height);
      tops.set(id, total);
      total += height;
    }
    return { heights, tops, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, byId, itemHeight]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useLayoutEffect(() => {
    order.forEach((id) => {
      const top = layout.tops.get(id) ?? 0;
      const previous = prevTops.get(id);
      prevTops.set(id, top);
      if (previous === undefined || previous === top || id === activeIdRef.current) return;

      const value = offsetFor(id);
      value.setValue(previous - top);
      Animated.spring(value, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 280,
      }).start();
    });
  });

  const responders = useRef(new Map<string, ReturnType<typeof PanResponder.create>>()).current;

  function responderFor(id: string) {
    const existing = responders.get(id);
    if (existing) return existing;

    const created = PanResponder.create({
      // Capture variants: claim the touch before the surrounding scroll view
      // can, rather than racing it for the same finger.
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        grantTop.current = layoutRef.current.tops.get(id) ?? 0;
        didMove.current = false;
        dragY.setValue(0);
        offsetFor(id).setValue(0);
        activeIdRef.current = id;
        setActiveId(id);
        dragStateRef.current?.(true);
        buzz();
      },
      onPanResponderMove: (_event, gesture) => {
        const { heights } = layoutRef.current;
        const draggedTop = grantTop.current + gesture.dy;

        // Where this row now belongs among the others. Inserting at slot k
        // would put its top at the k-th other's stacked offset, so compare
        // the dragged *top* — not its centre — against their midpoints, and
        // take the last slot it has cleared.
        const others = orderRef.current.filter((other) => other !== id);
        let accumulated = 0;
        let target = 0;
        for (const other of others) {
          const height = heights.get(other) ?? 0;
          if (draggedTop <= accumulated + height / 2) break;
          accumulated += height;
          target += 1;
        }

        let next = orderRef.current;
        if (next.indexOf(id) !== target) {
          next = [...others];
          next.splice(target, 0, id);
          orderRef.current = next;
          didMove.current = true;
          setOrder(next);
          buzz();
        }

        // Position from the finger, not from the slot: the slot may have just
        // changed under it, and this render hasn't happened yet.
        let myTop = 0;
        for (const other of next) {
          if (other === id) break;
          myTop += heights.get(other) ?? 0;
        }
        dragY.setValue(draggedTop - myTop);
      },
      onPanResponderRelease: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 240,
        }).start();
        activeIdRef.current = null;
        setActiveId(null);
        dragStateRef.current?.(false);
        if (didMove.current) onReorder(orderRef.current);
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        activeIdRef.current = null;
        setActiveId(null);
        dragStateRef.current?.(false);
      },
    });

    responders.set(id, created);
    return created;
  }

  return (
    <View style={{ height: layout.total }}>
      {order.map((id, slot) => {
        const item = byId.get(id);
        if (!item) return null;
        const isActive = activeId === id;
        const binding: DragBinding = { handlers: responderFor(id).panHandlers, isActive };
        return (
          <Animated.View
            key={id}
            style={[
              styles.row,
              {
                height: layout.heights.get(id) ?? 0,
                top: layout.tops.get(id) ?? 0,
                zIndex: isActive ? 10 : 1,
                transform: [{ translateY: isActive ? dragY : offsetFor(id) }],
                shadowOpacity: isActive ? 0.22 : 0,
              },
            ]}>
            <View style={styles.rowInner}>{renderItem(item, slot, binding)}</View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  rowInner: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
});
