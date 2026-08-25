import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';

import { Radii, Spacing, useColors } from '../constants';

function buzz() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

interface DraggableListProps<T> {
  data: T[];
  idOf: (item: T) => string;
  /** Fixed height per row, including the gap beneath it. */
  itemHeight: number;
  renderItem: (item: T) => React.ReactNode;
  /** Fires with the new id order once a drag settles. */
  onReorder: (orderedIds: string[]) => void;
}

/**
 * Hold-and-drag reorder list. Drivers sort their sheet by hand on paper, so
 * this mirrors that: grab the grip on the right of a card, drag up or down,
 * and the new order sticks.
 *
 * Built on core `PanResponder` rather than react-native-gesture-handler: the
 * gesture lives only on the narrow grip, so there's nothing to arbitrate
 * against the surrounding scroll view, and PanResponder behaves identically
 * on device and in the browser (RNGH's web layer does not).
 */
export function DraggableList<T>({
  data,
  idOf,
  itemHeight,
  renderItem,
  onReorder,
}: DraggableListProps<T>) {
  const colors = useColors();
  const ids = useMemo(() => data.map(idOf), [data, idOf]);
  const [order, setOrder] = useState<string[]>(ids);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mirrors of the live state for the PanResponder closures, which are
  // created once per row and would otherwise capture stale values.
  const orderRef = useRef(order);
  orderRef.current = order;

  const dragY = useRef(new Animated.Value(0)).current;
  /** Slot the dragged row started from, plus how far it has since shifted. */
  const dragOrigin = useRef(0);
  const shifted = useRef(0);

  // Re-seat when the underlying list changes (a parcel delivered and dropped
  // out, or a new one assigned), preserving the driver's existing order for
  // everything that's still there.
  useEffect(() => {
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      const next = [...kept, ...added];
      return next.length === prev.length && next.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [ids]);

  const byId = useMemo(() => new Map(data.map((item) => [idOf(item), item] as const)), [data, idOf]);

  function makeResponder(id: string) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragOrigin.current = orderRef.current.indexOf(id);
        shifted.current = 0;
        dragY.setValue(0);
        setActiveId(id);
        buzz();
      },
      onPanResponderMove: (_e, gesture) => {
        dragY.setValue(gesture.dy - shifted.current * itemHeight);

        const current = orderRef.current.indexOf(id);
        const target = Math.max(
          0,
          Math.min(
            orderRef.current.length - 1,
            dragOrigin.current + Math.round(gesture.dy / itemHeight)
          )
        );
        if (target !== current) {
          const next = [...orderRef.current];
          next.splice(current, 1);
          next.splice(target, 0, id);
          orderRef.current = next;
          shifted.current = target - dragOrigin.current;
          dragY.setValue(gesture.dy - shifted.current * itemHeight);
          setOrder(next);
          buzz();
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
        setActiveId(null);
        onReorder(orderRef.current);
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        setActiveId(null);
      },
    });
  }

  return (
    <View style={{ height: order.length * itemHeight }}>
      {order.map((id, slot) => {
        const item = byId.get(id);
        if (!item) return null;
        const isActive = activeId === id;
        return (
          <Animated.View
            key={id}
            style={[
              styles.row,
              {
                height: itemHeight,
                top: slot * itemHeight,
                zIndex: isActive ? 10 : 1,
                transform: isActive ? [{ translateY: dragY }] : [],
                shadowOpacity: isActive ? 0.22 : 0,
              },
            ]}>
            <View style={styles.rowInner}>
              <View style={styles.content}>{renderItem(item)}</View>
              {/* The grip is the only drag target — the card body keeps
                  scrolling normally, and drivers get an obvious place to
                  grab since the app has no onboarding. */}
              <View
                style={[
                  styles.handle,
                  isActive && { backgroundColor: colors.accentSoft, borderRadius: Radii.sm },
                ]}
                {...makeResponder(id).panHandlers}>
                <Ionicons
                  name="reorder-two"
                  size={22}
                  color={isActive ? colors.accent : colors.textTertiary}
                />
              </View>
            </View>
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
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  content: {
    flex: 1,
  },
  handle: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
});
