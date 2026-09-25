import { Host } from '@expo/ui';
import {
  Button,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  Animation,
  animation,
  background,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listStyle,
  opacity,
  padding,
  refreshable,
  scaleEffect,
  scrollContentBackground,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useColors } from '../constants';
import type { NativeAlertRow, NativeAlertsListProps } from './NativeAlertsList.types';

/** Rows sliding out or back in, and the list closing up behind them. */
const LIST_CHANGE = Animation.spring({ response: 0.35, dampingFraction: 0.9 });
/** The unread dot popping in or shrinking away. */
const DOT_CHANGE = Animation.spring({ response: 0.4, dampingFraction: 0.6 });

/**
 * Alerts on iOS, built the way Mail is: a native list whose rows use the
 * system's own swipe actions.
 *
 * - Swipe left for Delete. A long swipe deletes in one go, the row flies off
 *   and the list closes up — the system's gesture, spring and haptics.
 * - Swipe right to mark read or unread, like Mail's envelope action.
 * - Unread alerts carry a kraft dot and a bolder title; when they're read the
 *   dot shrinks away with a small spring rather than the row changing color.
 * - Pull down to refresh; tap a row for the system press highlight.
 */
export function NativeAlertsList({
  sections,
  labels,
  onOpen,
  onDelete,
  onToggleRead,
  onRefresh,
}: NativeAlertsListProps) {
  const colors = useColors();
  // Any change in how many rows there are (a delete, an Undo, Clear all)
  // animates the list instead of snapping it.
  const rowCount = sections.reduce((sum, section) => sum + section.rows.length, 0);

  const row = (item: NativeAlertRow) => (
    <SwipeActions key={item.id}>
      <Button
        onPress={() => onOpen(item.id)}
        modifiers={[listRowBackground(colors.bgElevated)]}>
        <HStack spacing={12} alignment="top">
          <Image
            systemName="circle.fill"
            size={9}
            color={colors.accent}
            modifiers={[
              frame({ width: 9 }),
              padding({ top: 12 }),
              scaleEffect(item.unread ? 1 : 0.01),
              opacity(item.unread ? 1 : 0),
              animation(DOT_CHANGE, item.unread),
            ]}
          />
          <Image
            systemName={item.symbol}
            size={15}
            color={item.color}
            modifiers={[
              frame({ width: 34, height: 34 }),
              background(item.soft, shapes.roundedRectangle({ cornerRadius: 9 })),
            ]}
          />
          <VStack alignment="leading" spacing={3}>
            <Text
              modifiers={[
                font({ textStyle: 'subheadline', weight: item.unread ? 'semibold' : 'regular' }),
                foregroundStyle(colors.text),
                lineLimit(1),
              ]}>
              {item.title}
            </Text>
            <Text
              modifiers={[
                font({ textStyle: 'footnote' }),
                foregroundStyle(colors.textSecondary),
                lineLimit(2),
              ]}>
              {item.message}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={6}>
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                foregroundStyle(item.unread ? colors.accent : colors.textTertiary),
              ]}>
              {item.time}
            </Text>
            {item.opens ? (
              <Image systemName="chevron.right" size={11} color={colors.textTertiary} />
            ) : null}
          </VStack>
        </HStack>
      </Button>

      <SwipeActions.Actions edge="trailing" allowsFullSwipe>
        <Button
          role="destructive"
          label={labels.delete}
          systemImage="trash.fill"
          onPress={() => onDelete(item.id)}
        />
      </SwipeActions.Actions>
      <SwipeActions.Actions edge="leading" allowsFullSwipe>
        <Button
          label={item.unread ? labels.read : labels.unread}
          systemImage={item.unread ? 'envelope.open.fill' : 'envelope.badge.fill'}
          onPress={() => onToggleRead(item.id, item.unread)}
          modifiers={[tint(colors.purple)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );

  return (
    <Host style={styles.fill}>
      <List
        modifiers={[
          listStyle('insetGrouped'),
          scrollContentBackground('hidden'),
          background(colors.bg),
          tint(colors.accent),
          refreshable(onRefresh),
          animation(LIST_CHANGE, rowCount),
        ]}>
        {sections.map((section) =>
          section.rows.length > 0 ? (
            <Section key={section.key} title={section.title}>
              {section.rows.map(row)}
            </Section>
          ) : null
        )}
      </List>
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
