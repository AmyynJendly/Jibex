import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { EmptyState } from '../../../components/EmptyState';
import { SkeletonRow } from '../../../components/Skeleton';
import {
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  sectionLabelStyle,
  useColors,
  type ColorPalette,
} from '../../../constants';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/mock-api';
import type { Notification, NotificationType } from '../../../types';

const STAGGER_MS = 40;

function typeStyle(type: NotificationType, colors: ColorPalette) {
  switch (type) {
    case 'pickup':
      return { icon: 'cube-outline' as const, color: colors.purple, soft: colors.purpleSoft };
    case 'delivery':
      return { icon: 'location-outline' as const, color: colors.accent, soft: colors.accentSoft };
    case 'cash':
      return { icon: 'card-outline' as const, color: colors.success, soft: colors.successSoft };
    case 'transfer':
      return {
        icon: 'swap-horizontal-outline' as const,
        color: colors.warning,
        soft: colors.warningSoft,
      };
    case 'return':
      return { icon: 'arrow-undo-outline' as const, color: colors.danger, soft: colors.dangerSoft };
  }
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function isYesterday(iso: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(iso).toDateString() === yesterday.toDateString();
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (isToday(iso)) {
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 60) return `${minutes}m`;
    return `${Math.round(minutes / 60)}h`;
  }
  if (isYesterday(iso)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AlertsScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  const load = useCallback(async () => {
    setNotifications(await getNotifications());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handlePress(id: string) {
    setNotifications((prev) =>
      prev ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev
    );
    await markNotificationRead(id);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    await markAllNotificationsRead();
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const today = notifications?.filter((n) => isToday(n.timestamp)) ?? [];
  const earlier = notifications?.filter((n) => !isToday(n.timestamp)) ?? [];

  function renderCard(notification: Notification, dimmed: boolean, index: number) {
    const style = typeStyle(notification.type, colors);
    return (
      <Animated.View
        key={notification.id}
        entering={FadeInUp.delay(index * STAGGER_MS).springify(220).dampingRatio(1)}>
        <AnimatedPressable
          onPress={() => handlePress(notification.id)}
          style={[
            styles.card,
            { backgroundColor: colors.bgElevated, opacity: dimmed ? 0.75 : 1 },
            getCardShadow(scheme),
          ]}>
          <View style={[styles.icon, { backgroundColor: style.soft }]}>
            <Ionicons name={style.icon} size={17} color={style.color} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {notification.message}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatTime(notification.timestamp)}
            </Text>
            {!notification.read && (
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            )}
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[Typography.pageTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Text onPress={handleMarkAllRead} style={[styles.markAllRead, { color: colors.accent }]}>
            Mark all read
          </Text>
        )}
      </View>

      {!notifications ? (
        <View style={styles.list}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <>
          {today.length > 0 && (
            <View style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                Today
              </Text>
              <View style={styles.list}>
                {today.map((n, i) => renderCard(n, false, i))}
              </View>
            </View>
          )}

          {earlier.length > 0 && (
            <View style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                Earlier
              </Text>
              <View style={styles.list}>
                {earlier.map((n, i) => renderCard(n, true, today.length + i))}
              </View>
            </View>
          )}

          {notifications.length === 0 && (
            <EmptyState icon="checkmark-circle-outline" title="You're all caught up" />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xxl,
    // `contentInsetAdjustmentBehavior="automatic"` already accounts for the
    // safe-area top inset — this is just breathing room on top of that.
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    paddingLeft: 2,
  },
  list: {
    gap: Spacing.smd,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: 20,
    padding: Spacing.mlg,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
