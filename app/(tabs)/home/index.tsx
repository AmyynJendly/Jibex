import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { CountUpText } from '../../../components/CountUpText';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { ParticleMotes } from '../../../components/ParticleMotes';
import { SkeletonBlock } from '../../../components/Skeleton';
import { SunArcGauge } from '../../../components/SunArcGauge';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoStyle,
  useColors,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { FALLBACK_ORIGIN, haversineKm } from '../../../lib/geo';
import { useLiveCoords } from '../../../lib/useLiveCoords';
import {
  confirmCashHandoff,
  confirmRunsheetReceipt,
  getDriverStats,
  getJobDetail,
  getNotifications,
  getRunsheets,
  getUser,
  optimizeRouteOrder,
} from '../../../services/mock-api';
import type { DriverStats, Job, Runsheet, User } from '../../../types';

const STAGGER_MS = 40;

interface HomeData {
  user: User;
  stats: DriverStats;
  hasUnreadNotifications: boolean;
  nextStop: Job | null;
  nextStopIndex: number;
  /** Fallback shown until (or unless) a real GPS fix resolves — the driver's assigned runsheet zone. */
  zone: string | null;
  /** Runsheets still awaiting the driver's receipt confirmation — their parcels are excluded from `nextStop` since they're not deliverable yet. */
  unconfirmedRunsheets: Runsheet[];
}

function getGreetingKey() {
  const hour = new Date().getHours();
  return hour < 18 ? 'home.greeting.morning' : 'home.greeting.evening';
}

const integerFormatter = (n: number) => String(Math.round(n));

export default function HomeScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const liveCoords = useLiveCoords();

  const load = useCallback(async () => {
    const [user, stats, runsheets, notifications] = await Promise.all([
      getUser(),
      getDriverStats(),
      getRunsheets(),
      getNotifications(),
    ]);

    const unconfirmedRunsheets = runsheets.filter((r) => r.status === 'A_CONFIRMER');
    // A runsheet still awaiting receipt confirmation isn't deliverable yet —
    // its stops can't be routed to or worked, so they're left out of the
    // "what's next today" ordering entirely (see runsheetDetail's blocked flow).
    const workableRunsheets = runsheets.filter((r) => r.status !== 'A_CONFIRMER');
    const workableStopIds = workableRunsheets.flatMap((r) => r.stopIds);
    const orderedIds = await optimizeRouteOrder(workableStopIds);

    // "Today's Deliveries" reflects every stop across every runsheet the
    // driver holds — including still-blocked ones, since those parcels are
    // genuinely assigned even if not yet workable — so it visibly moves the
    // moment a stop in Runsheets gets delivered or failed, instead of
    // trailing a separate counter nothing else touches.
    const allStopIds = runsheets.flatMap((r) => r.stopIds);
    const allJobs = await Promise.all(allStopIds.map((id) => getJobDetail(id)));
    const jobById = new Map(allJobs.map((j) => [j.id, j] as const));

    const orderedWorkableJobs = orderedIds.map((id) => jobById.get(id)).filter((j): j is Job => !!j);
    const nextStop =
      orderedWorkableJobs.find((j) => j.status === 'IN_TRANSIT') ??
      orderedWorkableJobs.find((j) => j.status === 'PENDING') ??
      null;
    const nextStopIndex = nextStop ? orderedIds.indexOf(nextStop.id) + 1 : 0;

    const delivered = allJobs.filter((j) => j.status === 'DELIVERED').length;
    const failed = allJobs.filter((j) => j.status === 'FAILED').length;
    const pending = allJobs.length - delivered - failed;
    const completionPercent = allJobs.length === 0 ? 0 : Math.round((delivered / allJobs.length) * 100);

    setData({
      user,
      stats: { ...stats, delivered, pending, failed, completionPercent },
      hasUnreadNotifications: notifications.some((n) => !n.read),
      nextStop,
      nextStopIndex,
      zone: workableRunsheets[0]?.zone ?? runsheets[0]?.zone ?? null,
      unconfirmedRunsheets,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Real device GPS (via `useLiveCoords`) reverse-geocoded into a label —
  // falls back silently to the runsheet zone (shown from `data.zone`) if
  // permission is denied or reverse geocoding isn't available on this
  // platform (e.g. Expo web).
  useEffect(() => {
    if (!liveCoords) return;
    let cancelled = false;

    Location.reverseGeocodeAsync({ latitude: liveCoords.lat, longitude: liveCoords.lng })
      .catch(() => [])
      .then(([place]) => {
        if (cancelled || !place) return;
        const label = [place.district || place.subregion, place.city].filter(Boolean).join(', ');
        if (label) setGpsLocation(label);
      });

    return () => {
      cancelled = true;
    };
  }, [liveCoords]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleDeposit() {
    if (!data || data.stats.cashCollectedTotal <= 0 || depositing) return;

    const confirmed = await confirm({
      title: t('home.depositConfirmTitle'),
      message: t('home.depositConfirmMessage', {
        amount: formatCurrency(data.stats.cashCollectedTotal),
      }),
      confirmLabel: t('home.deposit'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    setDepositing(true);
    await confirmCashHandoff();
    await load();
    setDepositing(false);
    showToast(t('home.depositedToast'));
  }

  async function handleConfirmReceipt(runsheet: Runsheet) {
    const confirmed = await confirm({
      title: t('runsheetDetail.confirmModalTitle'),
      message: t('runsheetDetail.confirmModalMessage', { count: runsheet.stopCount }),
      confirmLabel: t('runsheetDetail.confirmReceipt'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    await confirmRunsheetReceipt(runsheet.id);
    await load();
    showToast(t('runsheetDetail.confirmedToast'));
  }

  if (!data) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <SkeletonBlock width={40} height={40} radius={20} />
            <SkeletonBlock width={40} height={40} radius={20} />
          </View>
          <View style={styles.skeletonGreeting}>
            <SkeletonBlock width={160} height={30} radius={6} />
            <SkeletonBlock width={120} height={14} radius={4} />
          </View>
          <SkeletonBlock height={190} radius={Radii.card} />
          <SkeletonBlock height={120} radius={Radii.card} />
          <View style={styles.compactRow}>
            <SkeletonBlock height={52} radius={Radii.xl} style={styles.compactWrapper} />
            <SkeletonBlock height={52} radius={Radii.xl} style={styles.compactWrapper} />
            <SkeletonBlock height={52} radius={Radii.xl} style={styles.compactWrapper} />
          </View>
          <SkeletonBlock height={64} radius={Radii.xxl} />
        </ScrollView>
      </View>
    );
  }

  const { user, stats, hasUnreadNotifications, nextStop, nextStopIndex, zone, unconfirmedRunsheets } = data;
  const locationLabel = gpsLocation ?? zone;
  const totalStops = stats.delivered + stats.pending + stats.failed;
  const firstName = user.name.split(' ')[0];
  const nextStopDistanceKm = nextStop
    ? haversineKm(liveCoords ?? FALLBACK_ORIGIN, nextStop.location)
    : 0;
  const nextStopEtaMinutes = nextStop ? Math.max(1, Math.round((nextStopDistanceKm / 35) * 60)) : 0;

  const compactActions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    soft: ColorValue;
    href: '/pickups' | '/transfers' | '/returns';
  }[] = [
    {
      key: 'pickups',
      label: t('common.nav.pickups'),
      icon: 'cube-outline',
      color: colors.purple,
      soft: colors.purpleSoft,
      href: '/pickups',
    },
    {
      key: 'transfers',
      label: t('common.nav.transfers'),
      icon: 'swap-horizontal-outline',
      color: colors.warning,
      soft: colors.warningSoft,
      href: '/transfers',
    },
    {
      key: 'returns',
      label: t('common.nav.returns'),
      icon: 'arrow-undo-outline',
      color: colors.danger,
      soft: colors.dangerSoft,
      href: '/returns',
    },
  ];

  const statItems = [
    { label: t('home.stats.delivered'), value: stats.delivered, color: colors.success },
    { label: t('home.stats.pending'), value: stats.pending, color: colors.warning },
    { label: t('home.stats.failed'), value: stats.failed, color: colors.danger },
    { label: t('home.stats.pickups'), value: stats.pickupsCount, color: colors.purple },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.warning, `${colors.warning}00`]}
        style={styles.heroGradient}
        pointerEvents="none"
      />
      <ParticleMotes style={styles.heroGradient} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
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
        <Text style={[Typography.largeTitle, styles.name, { color: colors.text }]}>
          {t(getGreetingKey())}, {firstName}
        </Text>
        {locationLabel && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.accent} />
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
              {locationLabel}
            </Text>
          </View>
        )}
      </View>

      {unconfirmedRunsheets.length > 0 && (
        <View style={styles.toConfirmSection}>
          <Text style={[monoStyle(11), styles.toConfirmTitle, { color: colors.warning }]}>
            {t('home.toConfirmTitle', { count: unconfirmedRunsheets.length })}
          </Text>
          {unconfirmedRunsheets.map((runsheet, i) => (
            <Animated.View
              key={runsheet.id}
              entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
              style={[
                styles.toConfirmCard,
                { backgroundColor: colors.bgElevated, borderColor: colors.warning },
                getCardShadow(scheme),
              ]}>
              <View style={styles.toConfirmText}>
                <Text style={[Typography.title3, { color: colors.text }]} numberOfLines={1}>
                  {runsheet.routeLabel}
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
                  {runsheet.agency} · {t('common.package', { count: runsheet.stopCount })}
                </Text>
              </View>
              <AnimatedPressable
                scaleTo={0.95}
                style={[styles.toConfirmButton, { backgroundColor: colors.warning }]}
                onPress={() => handleConfirmReceipt(runsheet)}>
                <Text style={styles.toConfirmButtonText}>{t('runsheetDetail.confirmReceipt')}</Text>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgElevated, borderRadius: Radii.card },
          getCardShadow(scheme),
        ]}>
        <Text style={[Typography.cardTitle, { color: colors.text }]}>
          {t('home.deliveriesCardTitle')}
        </Text>
        <SunArcGauge
          percent={stats.completionPercent}
          caption={t('home.stopsCaption', { delivered: stats.delivered, total: totalStops })}
          style={styles.arcGauge}
          scale={0.78}
        />
        <View style={[styles.paceRow, { backgroundColor: colors.bg }]}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={[Typography.footnote, styles.paceText, { color: colors.textSecondary }]}>
            {t('home.onPace', { time: stats.onPaceFinishTime })}
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

      {nextStop && (
        <AnimatedPressable
          scaleTo={0.98}
          onPress={() => router.push({ pathname: '/job/[id]', params: { id: nextStop.id } })}
          style={[
            styles.nextStopCard,
            { backgroundColor: colors.bgElevated, borderColor: colors.accent },
            getCardShadow(scheme),
          ]}>
          <View style={styles.nextStopTopRow}>
            <Text style={[monoStyle(11), styles.nextStopLabel, { color: colors.accent }]}>
              {t('home.nextStop.label')}
              {nextStopIndex ? ` · ${nextStopIndex}` : ''}
            </Text>
            <Text style={[monoStyle(11), { color: colors.textSecondary }]}>
              {t('home.nextStop.distanceEta', {
                distance: nextStopDistanceKm.toFixed(1),
                minutes: nextStopEtaMinutes,
              })}
            </Text>
          </View>
          <View style={styles.nextStopBody}>
            <View style={styles.nextStopText}>
              <Text style={[Typography.title3, { color: colors.text }]} numberOfLines={1}>
                {nextStop.customerName}
              </Text>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]} numberOfLines={1}>
                {nextStop.address}
              </Text>
            </View>
            <View style={[styles.nextStopIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="cube-outline" size={17} color={colors.accent} />
            </View>
          </View>
          <View style={styles.nextStopBottomRow}>
            <View>
              <Text style={[monoStyle(9), styles.nextStopCodLabel, { color: colors.textTertiary }]}>
                {t('home.nextStop.codLabel')}
              </Text>
              <Text style={[monoStyle(19, 'medium'), { color: colors.text }]}>
                {formatCurrency(nextStop.cashToCollect)}
              </Text>
            </View>
            <View style={[styles.goPill, { backgroundColor: colors.accent }]}>
              <Ionicons name="navigate" size={12} color="#fff" />
              <Text style={styles.goPillText}>{t('home.nextStop.go')}</Text>
            </View>
          </View>
        </AnimatedPressable>
      )}

      <View style={styles.compactRow}>
        {compactActions.map((action, i) => (
          <Animated.View
            key={action.key}
            entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
            style={styles.compactWrapper}>
            <AnimatedPressable
              scaleTo={0.95}
              onPress={() => router.push(action.href)}
              style={[
                styles.compactAction,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <View style={[styles.compactActionIcon, { backgroundColor: action.soft }]}>
                <Ionicons name={action.icon} size={16} color={action.color} />
              </View>
              <Text
                style={[Typography.caption2, { color: colors.text }]}
                numberOfLines={1}>
                {action.label}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        ))}
      </View>

      <View style={styles.cashStrip}>
        <View style={styles.cashIcon}>
          <Ionicons name="card-outline" size={18} color="#F5EEE6" />
        </View>
        <View style={styles.cashTextStack}>
          <Text style={[monoStyle(10), styles.cashLabel]}>{t('home.cashCollected')}</Text>
          <CountUpText
            value={stats.cashCollectedTotal}
            formatter={formatCurrency}
            style={[monoStyle(22, 'medium'), styles.cashAmount]}
          />
        </View>
        <AnimatedPressable
          scaleTo={0.94}
          disabled={stats.cashCollectedTotal <= 0 || depositing}
          style={[
            styles.depositPill,
            { backgroundColor: colors.warning, opacity: stats.cashCollectedTotal <= 0 ? 0.5 : 1 },
          ]}
          onPress={handleDeposit}>
          <Text style={[Typography.caption1, { color: '#2E3439' }]}>
            {depositing ? t('home.depositing') : t('home.deposit')}
          </Text>
        </AnimatedPressable>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 230,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    // `contentInsetAdjustmentBehavior="automatic"` below already pushes content
    // past the status bar/notch — this is just breathing room on top of that,
    // not a second safe-area offset.
    paddingTop: Spacing.sm,
    paddingBottom: 100,
    gap: Spacing.smd,
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
    marginTop: -8,
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
  toConfirmSection: {
    gap: Spacing.sm,
  },
  toConfirmTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 11,
  },
  toConfirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.lg,
  },
  toConfirmText: {
    flex: 1,
    gap: 2,
  },
  toConfirmButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smd,
    borderRadius: Radii.full,
  },
  toConfirmButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 12,
    color: '#2E3439',
  },
  card: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  arcGauge: {
    marginTop: -10,
    marginBottom: -6,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  paceText: {
    fontFamily: Fonts.archivoMedium,
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
  // Fixed dark-charcoal card, not theme-adaptive — same reasoning as
  // `getAccentGlow`: the design hardcodes this regardless of light/dark.
  cashStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#4E565F',
  },
  cashIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,238,230,0.16)',
  },
  cashTextStack: {
    flex: 1,
    gap: 1,
  },
  cashLabel: {
    letterSpacing: 0.14 * 10,
    color: 'rgba(245,238,230,0.7)',
  },
  cashAmount: {
    color: '#F5EEE6',
  },
  depositPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    borderRadius: Radii.md - 1,
  },
  nextStopCard: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  nextStopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextStopLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.04 * 11,
  },
  nextStopBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  nextStopText: {
    flex: 1,
  },
  nextStopIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStopBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  nextStopCodLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.1 * 9,
    marginBottom: 2,
  },
  goPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  goPillText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 12,
    color: '#fff',
  },
  compactRow: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
  compactWrapper: {
    flex: 1,
  },
  compactAction: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  compactActionIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
