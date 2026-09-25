import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ColorValue,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { CountUpText } from '../../../components/CountUpText';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PackageCube } from '../../../components/PackageCube';
import { StopLink } from '../../../components/StopLink';
import { LoadError } from '../../../components/LoadError';
import { SkeletonBlock } from '../../../components/Skeleton';
import { SunArcGauge } from '../../../components/SunArcGauge';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { WalletChip } from '../../../components/WalletChip';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoStyle,
  useColors,
} from '../../../constants';
import { formatCurrency, formatDecimal } from '../../../lib/currency';
import { FALLBACK_ORIGIN, haversineKm } from '../../../lib/geo';
import { useLiveCoords } from '../../../lib/useLiveCoords';
import { useNextStop } from '../../../lib/useNextStop';
import {
  invalidateDeliveryData,
  useDriverStats,
  useJobsByIds,
  useRunsheets,
  useScreenState,
  useUser,
} from '../../../lib/query';
import { confirmRunsheetReceipt } from '../../../services/mock-api';
import type { DriverStats, Runsheet, User } from '../../../types';

interface HomeData {
  user: User;
  stats: DriverStats;
  /** Fallback shown until (or unless) a real GPS fix resolves — the driver's assigned runsheet zone. */
  zone: string | null;
  /** Runsheets still awaiting the driver's receipt confirmation — their parcels are excluded from `nextStop` since they're not deliverable yet. */
  unconfirmedRunsheets: Runsheet[];
}

/**
 * Which greeting fits the time on the driver's phone.
 *
 * This used to be a single split at 18:00, so a driver starting a 6am round
 * and one finishing at 5pm were both told "Good Morning". Drivers work long
 * enough days to notice. The late band runs past midnight, hence the `||`
 * rather than a range.
 */
function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) return 'home.greeting.late';
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

const integerFormatter = (n: number) => String(Math.round(n));

export default function HomeScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const [refreshing, setRefreshing] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const liveCoords = useLiveCoords();

  const userQuery = useUser();
  const statsQuery = useDriverStats();
  const runsheetsQuery = useRunsheets();

  const runsheets = useMemo(() => runsheetsQuery.data ?? [], [runsheetsQuery.data]);

  // Awaiting a first signature, or holding a count the driver hasn't
  // re-attested to since dispatch changed it — same standing either way.
  const unconfirmedRunsheets = useMemo(
    () => runsheets.filter((r) => r.needsConfirmation && r.status !== 'VALIDE'),
    [runsheets]
  );
  // Parcels the driver hasn't signed for aren't deliverable yet, so they're
  // left out of the "what's next today" ordering entirely — matching the
  // locked cards in Runsheets.
  const workableRunsheets = useMemo(() => {
    const blocked = new Set(unconfirmedRunsheets.map((r) => r.id));
    return runsheets.filter((r) => !blocked.has(r.id));
  }, [runsheets, unconfirmedRunsheets]);

  // "Today's Deliveries" reflects every stop across every runsheet the driver
  // holds — including still-blocked ones, since those parcels are genuinely
  // assigned even if not yet workable — so it moves the moment a stop in
  // Runsheets is delivered or failed.
  const allStopIds = useMemo(() => runsheets.flatMap((r) => r.stopIds), [runsheets]);

  const jobsQuery = useJobsByIds(allStopIds);
  const { nextStop, index: nextStopIndex } = useNextStop();

  const screen = useScreenState([userQuery, statsQuery, runsheetsQuery]);

  const data = useMemo<HomeData | null>(() => {
    const user = userQuery.data;
    const stats = statsQuery.data;
    if (!user || !stats) return null;

    const allJobs = jobsQuery.data ?? [];
    const delivered = allJobs.filter((j) => j.status === 'DELIVERED').length;
    const failed = allJobs.filter((j) => j.status === 'FAILED').length;

    return {
      user,
      stats: {
        ...stats,
        delivered,
        pending: allJobs.length - delivered - failed,
        failed,
        completionPercent:
          allJobs.length === 0 ? 0 : Math.round((delivered / allJobs.length) * 100),
      },
      zone: workableRunsheets[0]?.zone ?? runsheets[0]?.zone ?? null,
      unconfirmedRunsheets,
    };
  }, [
    userQuery.data,
    statsQuery.data,
    jobsQuery.data,
    workableRunsheets,
    runsheets,
    unconfirmedRunsheets,
  ]);

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
    await invalidateDeliveryData();
    setRefreshing(false);
  }, []);

  async function handleConfirmReceipt(runsheet: Runsheet) {
    const isRecount = runsheet.status !== 'A_CONFIRMER';
    const confirmed = await confirm({
      title: isRecount
        ? t('runsheets.confirm.recountTitle', { count: runsheet.stopCount })
        : t('runsheets.confirm.title', { count: runsheet.stopCount }),
      message: t('runsheets.confirm.dialogMessage', { count: runsheet.stopCount }),
      confirmLabel: isRecount
        ? t('runsheets.confirm.recountAction')
        : t('runsheets.confirm.action'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    await confirmRunsheetReceipt(runsheet.id);
    await invalidateDeliveryData();
    showToast(t('runsheets.confirm.toast'));
  }

  // A failure with nothing cached is the only case where the driver gets a
  // wall instead of the screen; otherwise the last good data stays up.
  if (!data && screen.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <LoadError onRetry={screen.retry} retrying={screen.retrying} />
        </ScrollView>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.topActions}>
              <SkeletonBlock width={40} height={40} radius={20} />
              <SkeletonBlock width={40} height={40} radius={20} />
            </View>
            <SkeletonBlock width={128} height={40} radius={20} />
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
            <SkeletonBlock height={52} radius={Radii.xl} style={styles.compactWrapper} />
          </View>
          <SkeletonBlock height={64} radius={Radii.xxl} />
        </ScrollView>
      </View>
    );
  }

  const { user, stats, zone } = data;
  const locationLabel = gpsLocation ?? zone;
  const totalStops = stats.delivered + stats.pending + stats.failed;
  const firstName = user.name.split(' ')[0];
  const nextStopDistanceKm = nextStop
    ? haversineKm(liveCoords ?? FALLBACK_ORIGIN, nextStop.location)
    : 0;
  const cashLabel = `${t('home.cashCollected')} · ${formatCurrency(stats.cashCollectedTotal)}`;
  const nextStopEtaMinutes = nextStop ? Math.max(1, Math.round((nextStopDistanceKm / 35) * 60)) : 0;

  const compactActions: {
    key: string;
    label: string;
    icon: IconName;
    color: string;
    soft: ColorValue;
    href: '/runsheets' | '/pickups' | '/transfers' | '/returns';
  }[] = [
    {
      key: 'runsheets',
      label: t('common.nav.runsheets'),
      icon: 'clipboard-outline',
      color: colors.accent,
      soft: colors.accentSoft,
      href: '/runsheets',
    },
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <View style={styles.topRow}>
          <View style={styles.topActions}>
            <GlassIconButton
              size={40}
              accessibilityLabel={t('home.a11y.search')}
              onPress={() => router.push('/search')}>
              <Icon name="search-outline" size={20} color={colors.text} />
            </GlassIconButton>
            <GlassIconButton
              size={40}
              accessibilityLabel={t('home.a11y.scan')}
              onPress={() => router.push('/scanner')}>
              <Icon name="scan-outline" size={20} color={colors.text} />
            </GlassIconButton>
          </View>
          {/* Read-only: cash is reconciled with the agency at the depot, not
              cleared from the driver's phone. A tap just names the figure. */}
          <WalletChip
            amount={stats.cashCollectedTotal}
            accessibilityLabel={cashLabel}
            onPress={() => showToast(cashLabel)}
          />
        </View>

      <View style={styles.greeting}>
        <Text style={[Typography.largeTitle, styles.name, { color: colors.text }]}>
          {t(getGreetingKey())}, {firstName}
        </Text>
        {locationLabel && (
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={13} color={colors.accent} />
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
            <View
              key={runsheet.id}
              style={[
                styles.toConfirmCard,
                { backgroundColor: colors.bgElevated, borderColor: colors.warning },
                getCardShadow(scheme),
              ]}>
              <View style={[styles.toConfirmIcon, { backgroundColor: colors.warningSoft }]}>
                <Icon name="lock-closed" size={16} color={colors.warning} />
              </View>
              <View style={styles.toConfirmText}>
                <Text style={[Typography.title3, { color: colors.text }]} numberOfLines={1}>
                  {t('common.package', { count: runsheet.stopCount })}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]} numberOfLines={1}>
                  {runsheet.zone}
                </Text>
              </View>
              <AnimatedPressable
                scaleTo={0.95}
                style={[styles.toConfirmButton, { backgroundColor: colors.warning }]}
                onPress={() => handleConfirmReceipt(runsheet)}>
                <Text style={styles.toConfirmButtonText}>
                  {runsheet.status === 'A_CONFIRMER'
                    ? t('runsheets.confirm.action')
                    : t('runsheets.confirm.recountAction')}
                </Text>
              </AnimatedPressable>
            </View>
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
          <Icon name="time-outline" size={14} color={colors.textTertiary} />
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
        <StopLink
          job={nextStop}
          scaleTo={0.98}
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
                distance: formatDecimal(nextStopDistanceKm),
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
              <PackageCube size={24} />
            </View>
          </View>
          <View style={styles.nextStopBottomRow}>
            <View style={styles.nextStopCod}>
              <Text style={[monoStyle(9), styles.nextStopCodLabel, { color: colors.textTertiary }]}>
                {t('home.nextStop.codLabel')}
              </Text>
              <Text
                style={[monoStyle(19, 'medium'), { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {formatCurrency(nextStop.cashToCollect)}
              </Text>
            </View>
            <View style={[styles.goPill, { backgroundColor: colors.accent }]}>
              <Icon name="navigate" size={12} color="#fff" />
              <Text style={styles.goPillText}>{t('home.nextStop.go')}</Text>
            </View>
          </View>
        </StopLink>
      )}

      <View style={styles.compactRow}>
        {compactActions.map((action, i) => (
          <View
            key={action.key}
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
                <Icon name={action.icon} size={20} color={action.color} />
              </View>
              <Text
                style={[styles.compactActionLabel, { color: colors.text }]}
                numberOfLines={1}>
                {action.label}
              </Text>
            </AnimatedPressable>
          </View>
        ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skeletonGreeting: {
    gap: Spacing.sm,
    marginTop: -6,
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
  toConfirmIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toConfirmText: {
    flex: 1,
    gap: 1,
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
    gap: Spacing.sm,
  },
  // `flex: 1` + `minWidth: 0` so the amount wraps/shrinks instead of pushing
  // the "Go" pill out of the card — the pill has a fixed content width and
  // was the row's only other flex item, which is exactly the shape that
  // broke on the job-detail cash card in French.
  nextStopCod: {
    flex: 1,
    minWidth: 0,
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
    flexWrap: 'wrap',
    gap: Spacing.smd,
  },
  // Two per row rather than four across: the French labels ("Ramassages",
  // "Transferts") get clipped at quarter width.
  compactWrapper: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  // Gloved thumbs in a moving van: these are the app's most-tapped shortcuts,
  // so the whole tile is the target and it clears Apple's 44pt minimum with
  // room to spare.
  compactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    minHeight: 64,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  compactActionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionLabel: {
    flex: 1,
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
});
