import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideOutLeft,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, sfSymbolFor } from '../../../components/Icon';
import { NativeAlertsList } from '../../../components/NativeAlertsList';
import type { NativeAlertRow } from '../../../components/NativeAlertsList.types';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useConfirm } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { invalidateNotifications, useNotifications, useScreenState } from '../../../lib/query';
import { LoadError } from '../../../components/LoadError';
import { SkeletonRow } from '../../../components/Skeleton';
import { SwipeDeleteAction } from '../../../components/SwipeDeleteAction';
import { ACTION_DISPLAY_MS, useToast } from '../../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  getCardShadow,
  monoStyle,
  sectionLabelStyle,
  useColors,
  type ColorPalette,
  morphIn,
} from '../../../constants';
import { localeTag } from '../../../lib/date';
import { useNow } from '../../../lib/useNow';
import {
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from '../../../services/mock-api';
import { useHapticsEnabled } from '../../../lib/haptics';
import type { Notification, NotificationTarget, NotificationType } from '../../../types';

/** Corner radius shared by the card, its shadow wrapper, and the swipeable's own clip mask — see `renderSwipeable`. */
const CARD_RADIUS = 20;

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

/** The remaining rows closing the gap — the same curve as an on-screen move. */
const CLOSE_GAP = LinearTransition.duration(280).easing(Easing.bezier(0.77, 0, 0.175, 1));
/** Delay between rows when "Clear all" sweeps the list, top to bottom. */
const CASCADE_STEP_MS = 45;
const SLIDE_OUT_MS = 260;

/**
 * Phones get "Read all" and "Clear all" as buttons in the navigation bar; the
 * web has no such bar items, so it keeps them on the page.
 */
const actionsInBar = Platform.OS !== 'web';

/** iOS draws the list natively, Mail-style (`NativeAlertsList`). */
const nativeList = Platform.OS === 'ios';

/** Gap between rows as "Read all" sweeps down the list. */
const READ_WAVE_STEP_MS = 55;

/** "Mark all read" is small text in a corner — give it a real target. */
const MARK_ALL_HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

export default function AlertsScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const notificationsQuery = useNotifications();
  const screen = useScreenState([notificationsQuery]);
  const notifications = notificationsQuery.data ?? null;
  const now = useNow();
  const { enabled: hapticsEnabled } = useHapticsEnabled();

  /**
   * Read state as the screen shows it right now, ahead of the server: set
   * the moment a row is swiped read / unread, or as the "Read all" wave
   * reaches it, and dropped once the refetch agrees.
   */
  const [readOverrides, setReadOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map()
  );
  const isRead = (n: Notification) => readOverrides.get(n.id) ?? n.read;
  function setReadOverride(id: string, read: boolean | null) {
    setReadOverrides((current) => {
      const next = new Map(current);
      if (read === null) next.delete(id);
      else next.set(id, read);
      return next;
    });
  }

  /**
   * A horizontal swipe never leaves the row's own bounds, so it never trips
   * `pressRetentionOffset` — the row's `AnimatedPressable` still sees a clean
   * press-in/press-out and fires `onPress` on release, even though the
   * swipe already revealed the delete action. Set the instant a real drag
   * starts (`onSwipeableOpenStartDrag`, ~10px — well past anything a tap's
   * finger jitter would trigger), consumed once by the next `handlePress`.
   */
  const swipeGuard = useRef<string | null>(null);

  /**
   * Alerts deleted on this screen but not yet on the server. The row leaves
   * straight away and the real delete waits out the Undo toast, so Undo is
   * just "show it again" rather than a re-create.
   */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** Set one render before "Clear all" removes the rows, so each leaves with its own delay. */
  const [clearingAll, setClearingAll] = useState(false);
  /** Which row's swipe has gone far enough to delete on release. */
  const fullSwipeArmed = useRef<string | null>(null);

  // Leaving the screen mid-Undo still deletes what the driver deleted.
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      if (pending.size === 0) return;
      const ids = [...pending.keys()];
      pending.forEach(clearTimeout);
      pending.clear();
      Promise.all(ids.map(deleteNotification)).then(invalidateNotifications);
    };
  }, []);

  function formatTime(iso: string) {
    const date = new Date(iso);
    if (isToday(iso)) {
      const minutes = Math.max(1, Math.round((now - date.getTime()) / 60_000));
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
    if (swipeGuard.current === notification.id) {
      swipeGuard.current = null;
      return;
    }
    if (notification.target) goToTarget(notification.target);
    markNotificationRead(notification.id).then(invalidateNotifications);
  }

  /**
   * "Read all" as a wave: one light tick, then each unread row turns read in
   * turn from the top down — its dot shrinking away — rather than every row
   * changing at once. The server write happens once the wave has passed.
   */
  async function handleMarkAllRead() {
    const unreadIds = (visible ?? []).filter((n) => !isRead(n)).map((n) => n.id);
    if (unreadIds.length === 0) return;
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const step = reduceMotion ? 0 : READ_WAVE_STEP_MS;
    unreadIds.forEach((id, i) => {
      if (step === 0) setReadOverride(id, true);
      else setTimeout(() => setReadOverride(id, true), i * step);
    });
    await new Promise((resolve) => setTimeout(resolve, unreadIds.length * step + 250));
    await markAllNotificationsRead();
    await invalidateNotifications();
    setReadOverrides(new Map());
  }

  /** The Mail-style leading swipe: flips one alert between read and unread. */
  async function handleToggleRead(id: string, currentlyUnread: boolean) {
    setReadOverride(id, currentlyUnread);
    await (currentlyUnread ? markNotificationRead(id) : markNotificationUnread(id));
    await invalidateNotifications();
    setReadOverride(id, null);
  }

  function setHidden(id: string, hidden: boolean) {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    setHidden(id, true);
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id);
      await deleteNotification(id);
      await invalidateNotifications();
      setHidden(id, false);
    }, ACTION_DISPLAY_MS);
    pendingDeletes.current.set(id, timer);

    showToast(t('alerts.deletedToast'), {
      label: t('common.undo'),
      onPress: () => {
        const pending = pendingDeletes.current.get(id);
        if (!pending) return;
        clearTimeout(pending);
        pendingDeletes.current.delete(id);
        setHidden(id, false);
      },
    });
  }

  async function handleDeleteAll() {
    // Clearing the whole list is not undoable, so it asks first — unlike
    // "mark all read", which loses nothing.
    const confirmed = await confirm({
      title: t('alerts.deleteAllTitle'),
      message: t('alerts.deleteAllMessage'),
      confirmLabel: t('alerts.deleteAllConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed || !notifications) return;

    // iOS: rows leave one after another from the top, and the native list
    // animates each one closing up.
    if (nativeList) {
      const ids = notifications.map((n) => n.id);
      const step = reduceMotion ? 0 : CASCADE_STEP_MS;
      ids.forEach((id, i) => setTimeout(() => setHidden(id, true), i * step));
      setTimeout(async () => {
        pendingDeletes.current.forEach(clearTimeout);
        pendingDeletes.current.clear();
        await deleteAllNotifications();
        await invalidateNotifications();
        setHiddenIds(new Set());
      }, ids.length * step + 400);
      return;
    }

    // Two steps: first every row learns its place in the sweep, then they
    // all go. Removing them in the same render would skip the delays.
    const ids = notifications.map((n) => n.id);
    setClearingAll(true);
    requestAnimationFrame(() => setHiddenIds(new Set(ids)));

    const sweepMs = reduceMotion ? 200 : ids.length * CASCADE_STEP_MS + SLIDE_OUT_MS;
    setTimeout(async () => {
      pendingDeletes.current.forEach(clearTimeout);
      pendingDeletes.current.clear();
      await deleteAllNotifications();
      await invalidateNotifications();
      setHiddenIds(new Set());
      setClearingAll(false);
    }, sweepMs);
  }

  const visible = notifications?.filter((n) => !hiddenIds.has(n.id)) ?? null;
  const hasAlerts = (visible?.length ?? 0) > 0;
  const unreadCount = visible?.filter((n) => !isRead(n)).length ?? 0;
  const today = visible?.filter((n) => isToday(n.timestamp)) ?? [];
  const earlier = visible?.filter((n) => !isToday(n.timestamp)) ?? [];

  /**
   * How a row leaves: sliding off to the left, the way the swipe that
   * deleted it was heading. "Clear all" staggers the rows top to bottom.
   * Reduce Motion fades instead.
   */
  function exitFor(order: number) {
    if (reduceMotion) return FadeOut.duration(180);
    const slide = SlideOutLeft.duration(SLIDE_OUT_MS).easing(Easing.bezier(0.23, 1, 0.32, 1));
    return clearingAll ? slide.delay(order * CASCADE_STEP_MS) : slide;
  }

  /**
   * Wraps a row so it can be swiped left onto a delete action.
   *
   * `ReanimatedSwipeable` runs the drag on the UI thread, so the row tracks
   * the finger even while the list is re-rendering behind it. The action is
   * only revealed on the right, matching the platform convention for a
   * destructive swipe. A short swipe leaves Delete open to tap; a long one
   * (past half the screen) deletes on release — see `SwipeDeleteAction`. A
   * deleted row slides off to the left, the rows below close the gap, and
   * the Undo toast brings it back.
   *
   * The card's shadow lives on this outer `View`, not on the card itself.
   * The library's own container (the thing that actually clips the row so
   * the delete action stays hidden until swiped) sets `overflow: 'hidden'`
   * on itself with no border radius of its own — so a shadow painted on a
   * *child* of that container was being cut off along that container's
   * square edges, which is what showed as a flat-edged box behind the
   * card's rounded corners. `containerStyle` rounds that clip mask to match
   * the card, and moving the shadow one level up, onto a plain view the
   * library never touches, keeps it soft and unclipped like every other
   * card in the app.
   */
  function renderSwipeable(notification: Notification, order: number, children: ReactNode) {
    return (
      <Animated.View
        key={notification.id}
        layout={reduceMotion ? undefined : CLOSE_GAP}
        exiting={exitFor(order)}
        style={[styles.shadowWrap, getCardShadow(scheme)]}>
        <ReanimatedSwipeable
          friction={2}
          rightThreshold={40}
          containerStyle={styles.swipeContainer}
          onSwipeableOpenStartDrag={() => {
            swipeGuard.current = notification.id;
          }}
          onSwipeableWillOpen={() => {
            // A long swipe deletes on release, like Mail — no second tap.
            if (fullSwipeArmed.current === notification.id) {
              fullSwipeArmed.current = null;
              handleDelete(notification.id);
            }
          }}
          renderRightActions={(_progress, translation) => (
            <SwipeDeleteAction
              translation={translation}
              color={colors.danger}
              radius={Radii.xxl}
              accessibilityLabel={t('alerts.deleteOne')}
              onDelete={() => handleDelete(notification.id)}
              onArmedChange={(armed) => {
                fullSwipeArmed.current = armed ? notification.id : null;
              }}
            />
          )}>
          {children}
        </ReanimatedSwipeable>
      </Animated.View>
    );
  }

  /**
   * One row for every notification, whether it arrived a minute ago or
   * yesterday. This used to single out the most recent unread alert into
   * its own "Now" section with its own gold styling — which meant reading
   * it (the read flag flips the instant you tap, before the navigation even
   * lands) made the card vanish from the screen outright, mid-tap. Unread is
   * a property of the card now, not a place it lives: it stays in Today or
   * Earlier exactly where it was, and only its color changes when it's read.
   */
  function renderCard(notification: Notification, order: number, dimmed: boolean) {
    const style = typeStyle(notification.type, colors);
    const unread = !isRead(notification);
    return renderSwipeable(
      notification,
      order,
      <Animated.View entering={morphIn(0, 8)}>
        <AnimatedPressable
          onPress={() => handlePress(notification)}
          accessibilityRole="button"
          accessibilityState={{ selected: unread }}
          accessibilityHint={notification.target ? t('alerts.a11yOpens') : undefined}
          style={[
            styles.card,
            {
              backgroundColor: unread ? colors.warningSoft : colors.bgElevated,
              opacity: dimmed ? 0.75 : 1,
            },
          ]}>
          <View style={[styles.icon, { backgroundColor: style.soft }]}>
            <Icon name={style.icon} size={17} color={style.color} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {notification.message}
            </Text>
          </View>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formatTime(notification.timestamp)}
          </Text>
          {/* Only alerts that actually lead somewhere get a chevron —
              otherwise every row promises a destination and some do nothing. */}
          {notification.target && (
            <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
          )}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  // Two plain, labelled buttons rather than a ⋯ menu: drivers should see
  // both actions without having to go looking for them.
  const barActions = actionsInBar && (unreadCount > 0 || hasAlerts) && (
    <Stack.Toolbar placement="right">
      {unreadCount > 0 && (
        <Stack.Toolbar.Button tintColor={colors.accent} onPress={handleMarkAllRead}>
          {t('alerts.markAllRead')}
        </Stack.Toolbar.Button>
      )}
      {hasAlerts && (
        <Stack.Toolbar.Button tintColor={colors.danger} onPress={handleDeleteAll}>
          {t('alerts.deleteAll')}
        </Stack.Toolbar.Button>
      )}
    </Stack.Toolbar>
  );

  const toNativeRow = (n: Notification, dimmed: boolean): NativeAlertRow => {
    const style = typeStyle(n.type, colors);
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      time: formatTime(n.timestamp),
      unread: !isRead(n),
      dimmed,
      symbol: sfSymbolFor(style.icon) ?? 'bell',
      color: style.color,
      soft: String(style.soft),
      opens: !!n.target,
    };
  };

  // iOS: Mail's list. It scrolls itself, so the bar keeps a regular title.
  // Loading, errors and an empty inbox fall through to the screen below.
  if (nativeList && visible && visible.length > 0) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>
        <Stack.Screen
          options={{ title: t('alerts.headerTitle'), headerLargeTitleEnabled: false }}
        />
        {barActions}
        <NativeAlertsList
          sections={[
            { key: 'today', title: t('alerts.today'), rows: today.map((n) => toNativeRow(n, false)) },
            {
              key: 'earlier',
              title: t('alerts.earlier'),
              rows: earlier.map((n) => toNativeRow(n, true)),
            },
          ]}
          labels={{
            delete: t('alerts.swipeDelete'),
            read: t('alerts.swipeRead'),
            unread: t('alerts.swipeUnread'),
          }}
          onOpen={(id) => {
            const n = visible.find((item) => item.id === id);
            if (n) handlePress(n);
          }}
          onDelete={handleDelete}
          onToggleRead={handleToggleRead}
          onRefresh={invalidateNotifications}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('alerts.headerTitle') }} />
      {barActions}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[sectionLabelStyle, styles.eyebrow, { color: colors.textTertiary }]}>
            {t('alerts.eyebrow')}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.onAccent }]}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {!actionsInBar && (
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
            {hasAlerts && (
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
        )}
      </View>

      {screen.isError && !visible ? (
        <LoadError onRetry={screen.retry} retrying={screen.retrying} />
      ) : !visible ? (
        <View style={styles.list}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <>
          {today.length > 0 && (
            <Animated.View
              layout={reduceMotion ? undefined : CLOSE_GAP}
              exiting={FadeOut.duration(160)}
              style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('alerts.today')}
              </Text>
              <View style={styles.list}>{today.map((n, i) => renderCard(n, i, false))}</View>
            </Animated.View>
          )}

          {earlier.length > 0 && (
            <Animated.View
              layout={reduceMotion ? undefined : CLOSE_GAP}
              exiting={FadeOut.duration(160)}
              style={styles.section}>
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('alerts.earlier')}
              </Text>
              <View style={styles.list}>
                {earlier.map((n, i) => renderCard(n, today.length + i, true))}
              </View>
            </Animated.View>
          )}

          {visible.length === 0 && (
            <Animated.View entering={FadeIn.duration(220).delay(clearingAll ? 0 : 120)}>
              <EmptyState icon="checkmark-circle-outline" title={t('alerts.empty')} />
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
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
    minHeight: 24,
  },
  eyebrow: {
    paddingLeft: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...monoStyle(12, 'medium'),
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
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    paddingLeft: 2,
  },
  list: {
    gap: Spacing.smd,
  },
  // Shadow only — no background, no clipping. See the note on `renderSwipeable`.
  shadowWrap: {
    borderRadius: CARD_RADIUS,
  },
  // The swipeable's own clip mask, rounded to match the card it wraps.
  swipeContainer: {
    borderRadius: CARD_RADIUS,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: CARD_RADIUS,
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
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
  },
  message: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    ...monoStyle(11),
    marginTop: 2,
  },
});
