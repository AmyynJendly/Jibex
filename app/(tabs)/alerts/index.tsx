import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { EmptyState } from '../../../components/EmptyState';
import { SkeletonRow } from '../../../components/Skeleton';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoStyle,
  sectionLabelStyle,
  useColors,
  type ColorPalette,
} from '../../../constants';
import { localeTag } from '../../../lib/date';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/mock-api';
import type { Notification, NotificationType } from '../../../types';

function typeStyle(type: NotificationType, colors: ColorPalette) {
  switch (type) {
    case 'PICKUP':
      return { icon: 'cube-outline' as const, color: colors.purple, soft: colors.purpleSoft };
    case 'DELIVERY':
      return { icon: 'location-outline' as const, color: colors.accent, soft: colors.accentSoft };
    case 'CASH':
      return { icon: 'card-outline' as const, color: colors.info, soft: colors.infoSoft };
    case 'TRANSFER':
      return {
        icon: 'swap-horizontal-outline' as const,
        color: colors.warning,
        soft: colors.warningSoft,
      };
    case 'RETURN':
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

export default function AlertsScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  function formatTime(iso: string) {
    const date = new Date(iso);
    if (isToday(iso)) {
      const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
      if (minutes < 60) return `${minutes}m`;
      return `${Math.round(minutes / 60)}h`;
    }
    if (isYesterday(iso)) return t('alerts.yesterday');
    return date.toLocaleDateString(localeTag(i18n.language), { month: 'short', day: 'numeric' });
  }

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
  const now = notifications?.[0];
  const isNowPriority = !!now && !now.read;
  const today = notifications?.filter((n) => isToday(n.timestamp) && n.id !== now?.id) ?? [];
  const earlier = notifications?.filter((n) => !isToday(n.timestamp)) ?? [];

  function renderPriorityCard(notification: Notification) {
    const style = typeStyle(notification.type, colors);
    return (
      <Animated.View entering={FadeInUp.springify(220).dampingRatio(1)}>
        <AnimatedPressable
          onPress={() => handlePress(notification.id)}
          style={[styles.priorityCard, { backgroundColor: style.soft }]}>
          <View style={[styles.priorityIcon, { backgroundColor: colors.bgElevated }]}>
            <Ionicons name={style.icon} size={19} color={style.color} />
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
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  function renderCard(notification: Notification, dimmed: boolean, index: number) {
    const style = typeStyle(notification.type, colors);
    return (
      <Animated.View
        key={notification.id}>
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
        <View>
          <Text style={[sectionLabelStyle, styles.eyebrow, { color: colors.textTertiary }]}>
            {t('alerts.eyebrow')}
          </Text>
          <View style={styles.headerLeft}>
            <Text style={[Typography.pageTitle, { color: colors.text }]}>{t('alerts.headerTitle')}</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <Text onPress={handleMarkAllRead} style={[styles.markAllRead, { color: colors.accent }]}>
            {t('alerts.markAllRead')}
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
          {isNowPriority && now && (
            <View style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('alerts.now')}
              </Text>
              {renderPriorityCard(now)}
            </View>
          )}

          {today.length > 0 && (
            <View style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('alerts.today')}
              </Text>
              <View style={styles.list}>
                {today.map((n, i) => renderCard(n, false, i))}
              </View>
            </View>
          )}

          {earlier.length > 0 && (
            <View style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('alerts.earlier')}
              </Text>
              <View style={styles.list}>
                {earlier.map((n, i) => renderCard(n, true, today.length + i))}
              </View>
            </View>
          )}

          {notifications.length === 0 && (
            <EmptyState icon="checkmark-circle-outline" title={t('alerts.empty')} />
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    paddingLeft: 2,
    marginBottom: 2,
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
    ...monoStyle(13, 'medium'),
    color: '#fff',
  },
  markAllRead: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
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
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: 20,
    padding: Spacing.mlg,
  },
  priorityIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
  },
  message: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  time: {
    ...monoStyle(11),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
