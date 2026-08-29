import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useConfirm } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { invalidateNotifications, useNotifications, useScreenState } from '../../../lib/query';
import { LoadError } from '../../../components/LoadError';
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
  morphIn,
} from '../../../constants';
import { localeTag } from '../../../lib/date';
import {
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/mock-api';
import type { Notification, NotificationTarget, NotificationType } from '../../../types';

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

/**
 * Resolves a notification's target to a route push.
 *
 * Every destination carries the tab to open on and, where the alert is about
 * one specific thing, that thing's id. Landing on the right list is not the
 * same as landing on the parcel — "Order #TRK-B6F31C08 refused" should put
 * the driver on that parcel in runsheet history, not on the runsheets tab
 * with ten cards to read through.
 */
function goToTarget(target: NotificationTarget) {
  switch (target.screen) {
    case 'job':
      router.push({ pathname: '/job/[id]', params: { id: target.jobId } });
      return;
    case 'pickups':
      router.push({ pathname: '/pickups', params: focusParams(target.tab, target.focusId) });
      return;
    case 'transfers':
      router.push({ pathname: '/transfers', params: focusParams(target.tab, target.focusId) });
      return;
    case 'returns':
      router.push({ pathname: '/returns', params: focusParams(target.tab, target.focusId) });
      return;
    case 'runsheets':
      router.push({
        pathname: '/(tabs)/runsheets',
        params: focusParams(target.tab, target.focusId),
      });
      return;
  }
}

function focusParams(tab: string, focusId?: string) {
  return focusId ? { tab, focus: focusId } : { tab };
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function isYesterday(iso: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(iso).toDateString() === yesterday.toDateString();
}

/** "Mark all read" is small text in a corner — give it a real target. */
const MARK_ALL_HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

export default function AlertsScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { confirm } = useConfirm();
  const notificationsQuery = useNotifications();
  const screen = useScreenState([notificationsQuery]);
  const notifications = notificationsQuery.data ?? null;

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

  /**
   * Tapping an alert marks it read and then goes where it points.
   *
   * Navigation happens first so the screen change feels instant; the read
   * flag and its refetch settle behind it. Waiting on the write before
   * moving made a tap feel like it had missed.
   */
  function handlePress(notification: Notification) {
    if (notification.target) goToTarget(notification.target);
    markNotificationRead(notification.id).then(invalidateNotifications);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await invalidateNotifications();
  }

  async function handleDelete(id: string) {
    await deleteNotification(id);
    await invalidateNotifications();
  }

  async function handleDeleteAll() {
    // Clearing the whole list is not undoable, so it asks first — unlike
    // "mark all read", which loses nothing.
    const confirmed = await confirm({
      title: t('alerts.deleteAllTitle'),
      message: t('alerts.deleteAllMessage'),
      confirmLabel: t('alerts.deleteAllConfirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    await deleteAllNotifications();
    await invalidateNotifications();
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const now = notifications?.[0];
  const isNowPriority = !!now && !now.read;
  const today = notifications?.filter((n) => isToday(n.timestamp) && n.id !== now?.id) ?? [];
  const earlier = notifications?.filter((n) => !isToday(n.timestamp)) ?? [];

  /**
   * Wraps a row so it can be swiped left onto a delete action.
   *
   * `ReanimatedSwipeable` runs the drag on the UI thread, so the row tracks
   * the finger even while the list is re-rendering behind it. The action is
   * only revealed on the right, matching the platform convention for a
   * destructive swipe, and the row is only removed once the driver actually
   * taps it — a swipe alone never deletes, since it is far too easy to do by
   * accident while scrolling.
   */
  function renderSwipeable(notification: Notification, children: ReactNode) {
    return (
      <ReanimatedSwipeable
        key={notification.id}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => (
          <AnimatedPressable
            haptic="medium"
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('alerts.deleteOne')}
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(notification.id)}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </AnimatedPressable>
        )}>
        {children}
      </ReanimatedSwipeable>
    );
  }

  function renderPriorityCard(notification: Notification) {
    const style = typeStyle(notification.type, colors);
    return renderSwipeable(
      notification,
      <Animated.View entering={morphIn(0, 12)}>
        <AnimatedPressable
          onPress={() => handlePress(notification)}
          accessibilityRole="button"
          accessibilityHint={notification.target ? t('alerts.a11yOpens') : undefined}
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
          {notification.target && (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          )}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  function renderCard(notification: Notification, dimmed: boolean, index: number) {
    const style = typeStyle(notification.type, colors);
    return renderSwipeable(
      notification,
      <Animated.View>
        <AnimatedPressable
          onPress={() => handlePress(notification)}
          accessibilityRole="button"
          accessibilityHint={notification.target ? t('alerts.a11yOpens') : undefined}
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
          {/* Only alerts that actually lead somewhere get a chevron —
              otherwise every row promises a destination and some do nothing. */}
          {notification.target && (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          )}
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
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <AnimatedPressable
              scaleTo={0.94}
              hitSlop={MARK_ALL_HIT_SLOP}
              accessibilityRole="button"
              onPress={handleMarkAllRead}>
              <Text style={[styles.markAllRead, { color: colors.accent }]}>
                {t('alerts.markAllRead')}
              </Text>
            </AnimatedPressable>
          )}
          {(notifications?.length ?? 0) > 0 && (
            <AnimatedPressable
              scaleTo={0.94}
              hitSlop={MARK_ALL_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('alerts.deleteAll')}
              onPress={handleDeleteAll}>
              <Text style={[styles.markAllRead, { color: colors.danger }]}>
                {t('alerts.deleteAll')}
              </Text>
            </AnimatedPressable>
          )}
        </View>
      </View>

      {screen.isError && !notifications ? (
        <LoadError onRetry={screen.retry} retrying={screen.retrying} />
      ) : !notifications ? (
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.mlg,
  },
  markAllRead: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  deleteAction: {
    width: 68,
    marginLeft: Spacing.sm,
    borderRadius: Radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
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
