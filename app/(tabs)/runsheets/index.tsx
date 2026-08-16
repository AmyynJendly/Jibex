import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { EmptyState } from '../../../components/EmptyState';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  useColors,
  type ColorPalette,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { enumLabel } from '../../../lib/enumLabel';
import { telUrl } from '../../../lib/phone';
import { getJobDetail, getRunsheets, optimizeRouteOrder } from '../../../services/mock-api';
import type { Job, JobStatus } from '../../../types';

type Segment = 'all' | 'pending' | 'delivered';

const STAGGER_MS = 40;

function statusColors(status: JobStatus, colors: ColorPalette) {
  switch (status) {
    case 'DELIVERED':
      return { color: colors.success, background: colors.successSoft };
    case 'FAILED':
      return { color: colors.danger, background: colors.dangerSoft };
    case 'IN_TRANSIT':
      return { color: colors.info, background: colors.infoSoft };
    case 'PENDING':
    default:
      return { color: colors.neutral, background: colors.neutralSoft };
  }
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [stops, setStops] = useState<Job[] | null>(null);
  const [agency, setAgency] = useState<string | null>(null);
  const [routeLabel, setRouteLabel] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setStops(null);
    const runsheets = await getRunsheets();
    setAgency(runsheets[0]?.agency ?? null);
    setRouteLabel(runsheets[0]?.routeLabel ?? null);
    const rawIds = runsheets.flatMap((r) => r.stopIds);
    const orderedIds = await optimizeRouteOrder(rawIds);
    const jobs = await Promise.all(orderedIds.map((id) => getJobDetail(id)));
    setStops(jobs);
  }, []);

  function handleOptimize() {
    load();
    showToast(t('runsheets.optimizedToast'));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pending = stops?.filter((s) => s.status !== 'DELIVERED') ?? [];
  const delivered = stops?.filter((s) => s.status === 'DELIVERED') ?? [];
  const displayed = segment === 'all' ? (stops ?? []) : segment === 'pending' ? pending : delivered;

  const emptyState =
    segment === 'all'
      ? { icon: 'file-tray-outline' as const, title: t('runsheets.empty.all') }
      : segment === 'pending'
        ? { icon: 'time-outline' as const, title: t('runsheets.empty.pending') }
        : { icon: 'checkmark-done-outline' as const, title: t('runsheets.empty.delivered') };

  const outstanding = stops?.filter((s) => s.status === 'PENDING' || s.status === 'IN_TRANSIT') ?? [];
  const remainingCount = outstanding.length;
  const codCount = outstanding.filter((s) => s.cashToCollect > 0).length;
  const totalCod = stops?.reduce((sum, s) => sum + s.cashToCollect, 0) ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {routeLabel && agency && (
              <Text style={[monoLabelStyle(11, 0.06), { color: colors.textSecondary }]}>
                {t('runsheets.headerEyebrow', { route: routeLabel, zone: agency })}
              </Text>
            )}
            <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
              {t('runsheets.headerTitle')}
            </Text>
          </View>
          <GlassIconButton size={36} onPress={() => router.push('/runsheet-schedule')}>
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
          </GlassIconButton>
        </View>

        <SegmentedControl
          segments={[
            { value: 'all', label: `${t('runsheets.segments.all')} ${stops?.length ?? 0}` },
            { value: 'pending', label: `${t('runsheets.segments.pending')} ${pending.length}` },
            { value: 'delivered', label: `${t('runsheets.segments.delivered')} ${delivered.length}` },
          ]}
          value={segment}
          onChange={setSegment}
        />

        {totalCod > 0 && (
          <View style={styles.codLine}>
            <Ionicons name="cash-outline" size={13} color={colors.accent} />
            <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
              {t('runsheets.codToCollect')}
            </Text>
            <Text style={[monoStyle(13, 'medium'), { color: colors.accent }]}>
              {formatCurrency(totalCod)}
            </Text>
          </View>
        )}

        {!stops ? (
          <View style={styles.skeletonGroup}>
            <SkeletonBlock height={128} radius={Radii.card} />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : displayed.length === 0 ? (
          <EmptyState icon={emptyState.icon} title={emptyState.title} />
        ) : (
          <View style={styles.list}>
            {displayed.map((stop, i) => {
              const sc = statusColors(stop.status, colors);
              const isDelivered = stop.status === 'DELIVERED';
              const isFailed = stop.status === 'FAILED';
              const isInTransit = stop.status === 'IN_TRANSIT';
              const isFirst = i === 0;
              const isLast = i === displayed.length - 1;
              const hasCod = stop.cashToCollect > 0;
              const isExpanded = expandedIds.has(stop.id);
              const paymentTag = hasCod ? t('runsheets.codTag') : t('runsheets.paidTag');
              const statusLabel = isDelivered
                ? enumLabel(t, 'jobStatus', stop.status)
                : isFailed
                  ? enumLabel(t, 'jobStatus', stop.status)
                  : isInTransit
                    ? t('runsheets.onRoute')
                    : paymentTag;
              return (
                <Animated.View
                  key={stop.id}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                  <View style={[styles.timelineRow, { opacity: isDelivered ? 0.7 : 1 }]}>
                    <View style={styles.timelineCol}>
                      {!isFirst && (
                        <View style={[styles.timelineLineTop, { borderColor: colors.separator }]} />
                      )}
                      {isDelivered ? (
                        <View style={[styles.timelineBadge, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      ) : (
                        <View style={[styles.timelineBadge, { backgroundColor: colors.neutralSoft }]}>
                          <Text style={[monoStyle(14, 'medium'), { color: colors.neutral }]}>
                            {i + 1}
                          </Text>
                        </View>
                      )}
                      {!isLast && (
                        <View
                          style={[styles.timelineLineBottom, { borderColor: colors.separator }]}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.timelineCard,
                        { backgroundColor: colors.bgElevated },
                        getCardShadow(scheme),
                      ]}>
                      <AnimatedPressable
                        scaleTo={0.98}
                        onPress={() => toggleExpand(stop.id)}
                        style={styles.timelineTopRow}>
                        <View style={styles.timelineText}>
                          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                            {stop.customerName}
                          </Text>
                          <Text
                            style={[Typography.subhead, { color: colors.textSecondary }]}
                            numberOfLines={1}>
                            {stop.address}
                          </Text>
                          {isFailed && stop.failureReason && (
                            <Text style={[styles.failureReasonText, { color: colors.danger }]}>
                              {enumLabel(t, 'failureReason', stop.failureReason)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.timelineTopRight}>
                          <Text
                            style={[
                              styles.rowStatusChip,
                              { color: sc.color, backgroundColor: sc.background },
                            ]}
                            numberOfLines={1}>
                            {statusLabel}
                          </Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.textTertiary}
                          />
                        </View>
                      </AnimatedPressable>

                      {isExpanded && (
                        <Animated.View
                          entering={FadeInDown.duration(180)}
                          style={[styles.expandedBlock, { borderTopColor: colors.separator }]}>
                          <View style={styles.contactRow}>
                            <View style={styles.contactInfo}>
                              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                              <Text style={[monoStyle(14, 'medium'), { color: colors.text }]}>
                                {stop.customerPhone}
                              </Text>
                            </View>
                            <AnimatedPressable
                              scaleTo={0.88}
                              style={[styles.callButton, { backgroundColor: colors.accentSoft }]}
                              onPress={() => Linking.openURL(telUrl(stop.customerPhone))}>
                              <Ionicons name="call" size={16} color={colors.accent} />
                            </AnimatedPressable>
                          </View>

                          <View style={styles.codOpenRow}>
                            <View>
                              <Text
                                style={[
                                  monoLabelStyle(10, 0.06),
                                  { color: colors.textTertiary },
                                ]}>
                                {hasCod ? t('jobDetail.codLabel') : t('runsheets.paidTag')}
                              </Text>
                              {hasCod ? (
                                <Text style={[monoStyle(24, 'medium'), { color: colors.accent }]}>
                                  {formatCurrency(stop.cashToCollect)}
                                </Text>
                              ) : (
                                <Text style={[Typography.title3, { color: colors.textSecondary }]}>
                                  —
                                </Text>
                              )}
                            </View>
                            <PrimaryButton
                              label={t('runsheets.open')}
                              height={44}
                              style={styles.openButton}
                              onPress={() => router.push(`/job/${stop.id}`)}
                            />
                          </View>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {stops && stops.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgElevated, borderTopColor: colors.separator },
          ]}>
          <Text style={[monoLabelStyle(11, 0.04), { color: colors.textSecondary }]}>
            {t('runsheets.remainingFooter', { stops: remainingCount, cod: codCount })}
          </Text>
          <AnimatedPressable
            scaleTo={0.95}
            onPress={handleOptimize}
            style={[styles.optimizeButton, { backgroundColor: colors.warning }]}>
            <Text style={styles.optimizeButtonText}>{t('runsheets.optimize')}</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    // `contentInsetAdjustmentBehavior="automatic"` already accounts for the
    // safe-area top inset — this is just breathing room on top of that.
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.mlg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: 26,
  },
  codLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  list: {
    gap: Spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.smd,
  },
  timelineCol: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timelineBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLineTop: {
    position: 'absolute',
    top: -Spacing.md,
    bottom: '50%',
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  timelineLineBottom: {
    position: 'absolute',
    top: '50%',
    bottom: -Spacing.md,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  timelineCard: {
    flex: 1,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.lg,
    overflow: 'hidden',
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingVertical: Spacing.lg,
  },
  timelineText: {
    flex: 1,
    gap: 2,
  },
  timelineTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTitle: {
    fontFamily: Fonts.archivoBold,
    fontSize: 17,
  },
  failureReasonText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  rowStatusChip: {
    ...monoStyle(12),
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  expandedBlock: {
    gap: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codOpenRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  openButton: {
    paddingHorizontal: Spacing.xxl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    paddingBottom: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optimizeButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.smd,
    borderRadius: Radii.full,
  },
  optimizeButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
    color: '#2E3439',
  },
});
