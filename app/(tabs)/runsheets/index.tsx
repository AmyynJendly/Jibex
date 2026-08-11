import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { EmptyState } from '../../../components/EmptyState';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import {
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  useColors,
  type ColorPalette,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { enumLabel } from '../../../lib/enumLabel';
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
      return { color: '#fff', background: colors.info };
    case 'PENDING':
    default:
      return { color: colors.neutral, background: colors.neutralSoft };
  }
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [stops, setStops] = useState<Job[] | null>(null);
  const [segment, setSegment] = useState<Segment>('all');

  const load = useCallback(async () => {
    setStops(null);
    const runsheets = await getRunsheets();
    const rawIds = runsheets.flatMap((r) => r.stopIds);
    const orderedIds = await optimizeRouteOrder(rawIds);
    const jobs = await Promise.all(orderedIds.map((id) => getJobDetail(id)));
    setStops(jobs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pending = stops?.filter((s) => s.status !== 'DELIVERED') ?? [];
  const delivered = stops?.filter((s) => s.status === 'DELIVERED') ?? [];

  const nextStop =
    stops && segment === 'all'
      ? (stops.find((s) => s.status === 'IN_TRANSIT') ?? stops.find((s) => s.status === 'PENDING'))
      : undefined;

  const bucket = segment === 'all' ? stops : segment === 'pending' ? pending : delivered;
  const listed = (bucket ?? []).filter((s) => s.id !== nextStop?.id);

  const emptyState =
    segment === 'all'
      ? { icon: 'file-tray-outline' as const, title: t('runsheets.empty.all') }
      : segment === 'pending'
        ? { icon: 'time-outline' as const, title: t('runsheets.empty.pending') }
        : { icon: 'checkmark-done-outline' as const, title: t('runsheets.empty.delivered') };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[Typography.pageTitle, { color: colors.text }]}>
          {t('runsheets.headerTitle')}
        </Text>
        <GlassIconButton onPress={() => router.push('/runsheet-schedule')}>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
        </GlassIconButton>
      </View>

      {stops && stops.length > 0 && (
        <View style={styles.optimizedRow}>
          <Ionicons name="navigate-outline" size={13} color={colors.accent} />
          <Text style={[styles.optimizedText, { color: colors.textSecondary }]}>
            {t('runsheets.optimizedRoute')}
          </Text>
        </View>
      )}

      <SegmentedControl
        segments={[
          { value: 'all', label: t('runsheets.segments.all') },
          { value: 'pending', label: t('runsheets.segments.pending') },
          { value: 'delivered', label: t('runsheets.segments.delivered') },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {!stops ? (
        <View style={styles.skeletonGroup}>
          <SkeletonBlock height={128} radius={Radii.card} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <>
          {nextStop &&
            (() => {
              const sc = statusColors(nextStop.status, colors);
              return (
                <Animated.View entering={FadeInUp.springify(220).dampingRatio(1)}>
                  <AnimatedPressable
                    onPress={() => router.push(`/job/${nextStop.id}`)}
                    style={[
                      styles.nextCard,
                      { backgroundColor: colors.bgElevated, borderColor: colors.accent },
                      getCardShadow(scheme),
                    ]}>
                    <View style={styles.nextCardTopRow}>
                      <Text style={[styles.nextCardLabel, { color: colors.accent }]}>
                        {t('runsheets.nextStop')}
                      </Text>
                      <Text
                        style={[
                          styles.nextCardStatusChip,
                          { color: sc.color, backgroundColor: sc.background },
                        ]}>
                        {enumLabel(t, 'jobStatus', nextStop.status)}
                      </Text>
                    </View>
                    <Text style={[Typography.title3, { color: colors.text }]}>
                      {nextStop.customerName}
                    </Text>
                    <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                      {nextStop.address}
                    </Text>
                    <Text style={[styles.codChip, { backgroundColor: colors.accent }]}>
                      {t('runsheets.codChip', { amount: formatCurrency(nextStop.cashToCollect) })}
                    </Text>
                  </AnimatedPressable>
                </Animated.View>
              );
            })()}

          {listed.length === 0 ? (
            <EmptyState icon={emptyState.icon} title={emptyState.title} />
          ) : (
            listed.map((stop, i) => {
              const sc = statusColors(stop.status, colors);
              const isDelivered = stop.status === 'DELIVERED';
              return (
                <Animated.View
                  key={stop.id}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                  <AnimatedPressable
                    onPress={() => router.push(`/job/${stop.id}`)}
                    style={[
                      styles.row,
                      { backgroundColor: colors.bgElevated, opacity: isDelivered ? 0.6 : 1 },
                      getCardShadow(scheme),
                    ]}>
                    {isDelivered ? (
                      <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
                        <Ionicons name="checkmark" size={15} color={colors.success} />
                      </View>
                    ) : (
                      <View style={[styles.rowIcon, { backgroundColor: colors.neutralSoft }]}>
                        <Text style={[styles.rowIndex, { color: colors.neutral }]}>{i + 1}</Text>
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {stop.customerName}
                      </Text>
                      <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                        {stop.address}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rowStatusChip,
                        { color: sc.color, backgroundColor: sc.background },
                      ]}>
                      {enumLabel(t, 'jobStatus', stop.status)}
                    </Text>
                    {!isDelivered && (
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    )}
                  </AnimatedPressable>
                </Animated.View>
              );
            })
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
    gap: Spacing.mlg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optimizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
  },
  optimizedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  nextCard: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.smd,
  },
  nextCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.04 * 12,
  },
  nextCardStatusChip: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md - 4,
    overflow: 'hidden',
  },
  codChip: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndex: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowStatusChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
});
