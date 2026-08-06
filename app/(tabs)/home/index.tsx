import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ColorValue,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { CountUpText } from '../../../components/CountUpText';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { GlassSurface } from '../../../components/GlassSurface';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SkeletonBlock } from '../../../components/Skeleton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../../../constants';
import { registerForPushNotifications } from '../../../lib/push';
import {
  getDriverStats,
  getJobDetail,
  getNotifications,
  getReturns,
  getRunsheets,
  getShiftStatus,
  getTransfers,
  getUser,
  startShift,
} from '../../../services/mock-api';
import type { DriverStats, Job, ShiftStatus, User } from '../../../types';

const STAGGER_MS = 40;

interface HomeData {
  user: User;
  stats: DriverStats;
  runsheetStops: number;
  activeTransfers: number;
  pendingReturns: number;
  hasUnreadNotifications: boolean;
  shiftStatus: ShiftStatus;
  timeSensitiveStops: Job[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const percentFormatter = (n: number) => `${Math.round(n)}%`;
const integerFormatter = (n: number) => String(Math.round(n));
const currencyFormatter = (n: number) => `${n.toFixed(2)} DT`;

export default function HomeScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  const load = useCallback(async () => {
    const [user, stats, runsheets, transfers, returns, notifications, shiftStatus] =
      await Promise.all([
        getUser(),
        getDriverStats(),
        getRunsheets(),
        getTransfers(),
        getReturns(),
        getNotifications(),
        getShiftStatus(),
      ]);

    const stopIds = runsheets.flatMap((r) => r.stopIds);
    const jobs = await Promise.all(stopIds.map((id) => getJobDetail(id)));
    const timeSensitiveStops = jobs.filter(
      (j) => j.deliverBy && j.status !== 'delivered' && j.status !== 'failed'
    );

    setData({
      user,
      stats,
      runsheetStops: runsheets.reduce((sum, r) => sum + r.stopCount, 0),
      activeTransfers: transfers.filter((t) => t.status === 'in-progress').length,
      pendingReturns: returns.filter((r) => r.status === 'pending-pickup').length,
      hasUnreadNotifications: notifications.some((n) => !n.read),
      shiftStatus,
      timeSensitiveStops,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleStartShift() {
    if (shiftBusy) return;
    setShiftBusy(true);
    const status = await startShift();
    registerForPushNotifications();
    setShiftBusy(false);
    setData((prev) => (prev ? { ...prev, shiftStatus: status } : prev));
  }

  if (!data) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <SkeletonBlock width={40} height={40} radius={20} />
          <SkeletonBlock width={40} height={40} radius={20} />
        </View>
        <View style={styles.skeletonGreeting}>
          <SkeletonBlock width={120} height={14} radius={4} />
          <SkeletonBlock width={160} height={30} radius={6} />
        </View>
        <SkeletonBlock height={64} radius={Radii.card} />
        <SkeletonBlock height={210} radius={Radii.card} />
        <SkeletonBlock height={64} radius={Radii.xxl} />
        <View style={styles.quickActions}>
          <SkeletonBlock height={70} radius={Radii.xl} style={styles.quickActionWrapper} />
          <SkeletonBlock height={70} radius={Radii.xl} style={styles.quickActionWrapper} />
          <SkeletonBlock height={70} radius={Radii.xl} style={styles.quickActionWrapper} />
          <SkeletonBlock height={70} radius={Radii.xl} style={styles.quickActionWrapper} />
        </View>
      </ScrollView>
    );
  }

  const {
    user,
    stats,
    runsheetStops,
    activeTransfers,
    pendingReturns,
    hasUnreadNotifications,
    shiftStatus,
    timeSensitiveStops,
  } = data;
  const totalStops = stats.delivered + stats.pending + stats.failed;
  const firstName = user.name.split(' ')[0];

  const quickActions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    soft: ColorValue;
    count: number;
    href: '/runsheets' | '/pickups' | '/transfers' | '/returns';
  }[] = [
    {
      key: 'runsheets',
      label: 'Runsheets',
      icon: 'list-outline',
      color: colors.accent,
      soft: colors.accentSoft,
      count: runsheetStops,
      href: '/runsheets',
    },
    {
      key: 'pickups',
      label: 'Pickups',
      icon: 'cube-outline',
      color: colors.purple,
      soft: colors.purpleSoft,
      count: stats.pickupsCount,
      href: '/pickups',
    },
    {
      key: 'transfers',
      label: 'Transfers',
      icon: 'swap-horizontal-outline',
      color: colors.warning,
      soft: colors.warningSoft,
      count: activeTransfers,
      href: '/transfers',
    },
    {
      key: 'returns',
      label: 'Returns',
      icon: 'arrow-undo-outline',
      color: colors.danger,
      soft: colors.dangerSoft,
      count: pendingReturns,
      href: '/returns',
    },
  ];

  const statItems = [
    { label: 'Delivered', value: stats.delivered, color: colors.success },
    { label: 'Pending', value: stats.pending, color: colors.warning },
    { label: 'Failed', value: stats.failed, color: colors.danger },
    { label: 'Pickups', value: stats.pickupsCount, color: colors.purple },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }>
      <View style={styles.topRow}>
        <GlassIconButton size={40} onPress={() => router.push('/scanner')}>
          <Ionicons name="scan-outline" size={20} color={colors.text} />
        </GlassIconButton>
        <GlassIconButton size={40} onPress={() => router.push('/alerts')}>
          <Ionicons
            name={hasUnreadNotifications ? 'notifications' : 'notifications-outline'}
            size={20}
            color={colors.text}
          />
          {hasUnreadNotifications && (
            <View
              style={[styles.badgeDot, { backgroundColor: colors.danger, borderColor: colors.bgElevated }]}
            />
          )}
        </GlassIconButton>
      </View>

      <View style={styles.greeting}>
        <Text style={[styles.greetingLabel, { color: colors.accent }]}>{getGreeting()}</Text>
        <Text style={[Typography.largeTitle, styles.name, { color: colors.text }]}>
          {firstName}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.accent} />
          <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
            Sousse, Sahloul 4
          </Text>
        </View>
      </View>

      {shiftStatus.isActive ? (
        <View style={[styles.shiftPill, { backgroundColor: colors.successSoft }]}>
          <View style={styles.shiftPillLeft}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.shiftPillText, { color: colors.text }]}>
              On Shift · Since {shiftStatus.startedAt ? formatTime(shiftStatus.startedAt) : '—'}
            </Text>
          </View>
          <Text
            onPress={() => router.push('/shift-summary')}
            style={[styles.endShiftLink, { color: colors.danger }]}>
            End Shift
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.shiftCard,
            { backgroundColor: colors.bgElevated, borderColor: colors.accent },
            getCardShadow(scheme),
          ]}>
          <View style={styles.shiftCardText}>
            <Text style={[Typography.cardTitle, { color: colors.text }]}>Ready to start?</Text>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
              Begin tracking today&apos;s deliveries
            </Text>
          </View>
          <PrimaryButton
            label="Start Shift"
            height={40}
            loading={shiftBusy}
            onPress={handleStartShift}
            style={styles.shiftButton}
            labelStyle={styles.shiftButtonLabel}
          />
        </View>
      )}

      {timeSensitiveStops.length > 0 && (
        <AnimatedPressable
          scaleTo={0.98}
          onPress={() => router.push('/runsheets')}
          style={[styles.timeSensitiveBanner, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="alarm-outline" size={18} color={colors.warning} />
          <Text style={[styles.timeSensitiveText, { color: colors.text }]}>
            {timeSensitiveStops.length} time-sensitive{' '}
            {timeSensitiveStops.length === 1 ? 'stop' : 'stops'} left today
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </AnimatedPressable>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgElevated, borderRadius: Radii.card },
          getCardShadow(scheme),
        ]}>
        <View style={styles.cardTopRow}>
          <Text style={[Typography.cardTitle, { color: colors.text }]}>Today&apos;s Deliveries</Text>
          <CountUpText
            value={stats.completionPercent}
            formatter={percentFormatter}
            style={[Typography.title2, { color: colors.accent }]}
          />
        </View>
        <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
          {stats.delivered} of {totalStops} completed
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${stats.completionPercent}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
        <View style={styles.paceRow}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={[Typography.footnote, styles.paceText, { color: colors.textSecondary }]}>
            On pace to finish by {stats.onPaceFinishTime}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.statRow}>
          {statItems.map((stat, i) => (
            <View key={stat.label} style={styles.statItemRow}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />}
              <View style={styles.statItem}>
                <CountUpText
                  value={stat.value}
                  formatter={integerFormatter}
                  style={[Typography.title2, { color: stat.color }]}
                />
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {stat.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cashStrip, { backgroundColor: colors.successSoft }]}>
        <View style={[styles.cashIcon, { backgroundColor: colors.success }]}>
          <Ionicons name="card-outline" size={18} color="#fff" />
        </View>
        <Text style={[styles.cashLabel, { color: colors.text }]}>Cash Collected</Text>
        <View style={{ flex: 1 }} />
        <CountUpText
          value={stats.cashCollectedTotal}
          formatter={currencyFormatter}
          style={[styles.cashAmount, { color: colors.text }]}
        />
      </View>

      <View style={styles.quickActions}>
        {quickActions.map((action, i) => (
          <Animated.View
            key={action.key}
            entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
            style={styles.quickActionWrapper}>
            <AnimatedPressable onPress={() => router.push(action.href)}>
              <GlassSurface style={styles.quickAction}>
                <Ionicons name={action.icon} size={20} color={action.color} />
                <View style={styles.quickActionLabelRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {action.label}
                  </Text>
                  <Text
                    style={[
                      styles.quickActionBadge,
                      { color: action.color, backgroundColor: action.soft },
                    ]}>
                    {action.count}
                  </Text>
                </View>
              </GlassSurface>
            </AnimatedPressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xxl,
    // `contentInsetAdjustmentBehavior="automatic"` below already pushes content
    // past the status bar/notch — this is just breathing room on top of that,
    // not a second safe-area offset.
    paddingTop: Spacing.md,
    paddingBottom: 130,
    gap: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  skeletonGreeting: {
    gap: Spacing.sm,
    marginTop: -6,
  },
  badgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  greeting: {
    marginTop: -6,
  },
  greetingLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 14,
  },
  name: {
    letterSpacing: -0.03 * 34,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  shiftCardText: {
    flex: 1,
    gap: 2,
  },
  shiftButton: {
    paddingHorizontal: Spacing.xl,
  },
  shiftButtonLabel: {
    fontSize: 14,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  shiftPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shiftPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  endShiftLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeSensitiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  timeSensitiveText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  paceText: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  cashStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.mlg,
    paddingHorizontal: Spacing.xl,
  },
  cashIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  cashAmount: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.01 * 19,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
  quickActionWrapper: {
    flex: 1,
  },
  quickAction: {
    height: 70,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickActionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickActionBadge: {
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
