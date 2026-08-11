import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkeletonBlock, SkeletonRow } from '../components/Skeleton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { getPickups } from '../services/mock-api';
import type { Pickup, PickupStatus } from '../types';

const STAGGER_MS = 40;

export default function PickupsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pickups, setPickups] = useState<Pickup[] | null>(null);
  const [segment, setSegment] = useState<PickupStatus>('SCHEDULED');

  useEffect(() => {
    getPickups().then(setPickups);
  }, []);

  const scheduled = pickups?.filter((p) => p.status === 'SCHEDULED') ?? [];
  const completed = pickups?.filter((p) => p.status === 'COMPLETED') ?? [];
  const nextPickup = segment === 'SCHEDULED' ? scheduled[0] : undefined;
  const restPickups = segment === 'SCHEDULED' ? scheduled.slice(1) : completed;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('pickups.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'SCHEDULED', label: t('pickups.segments.scheduled') },
            { value: 'COMPLETED', label: t('pickups.segments.completed') },
          ]}
          value={segment}
          onChange={setSegment}
        />

        {!pickups ? (
          <View style={styles.skeletonGroup}>
            <SkeletonBlock height={140} radius={Radii.card} />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            {nextPickup && (
              <Animated.View
                entering={FadeInUp.springify(220).dampingRatio(1)}
                style={[
                  styles.nextCard,
                  { backgroundColor: colors.bgElevated, borderColor: colors.accent },
                  getCardShadow(scheme),
                ]}>
                <View style={styles.nextCardTopRow}>
                  <Text style={[styles.nextCardLabel, { color: colors.accent }]}>
                    {t('pickups.nextPickup')}
                  </Text>
                  <Text
                    style={[
                      styles.timeChip,
                      { color: colors.text, backgroundColor: colors.separator },
                    ]}>
                    {nextPickup.timeWindow}
                  </Text>
                </View>
                <Text style={[Typography.title3, { color: colors.text }]}>
                  {nextPickup.businessName}
                </Text>
                <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                  {nextPickup.address}
                </Text>
                <View style={styles.nextCardBottomRow}>
                  <Text style={[styles.packageCount, { color: colors.textTertiary }]}>
                    {t('common.package', { count: nextPickup.packageCount })}
                  </Text>
                  <PrimaryButton
                    label={t('pickups.startPickup')}
                    onPress={() => router.push('/scanner')}
                    height={38}
                    style={styles.startButton}
                    labelStyle={styles.startButtonLabel}
                  />
                </View>
              </Animated.View>
            )}

            {restPickups.length === 0 && !nextPickup ? (
              <EmptyState
                icon={segment === 'SCHEDULED' ? 'cube-outline' : 'checkmark-done-outline'}
                title={segment === 'SCHEDULED' ? t('pickups.empty.scheduled') : t('pickups.empty.completed')}
              />
            ) : (
              restPickups.map((pickup, i) => (
                <Animated.View
                  key={pickup.id}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                  <AnimatedPressable
                    onPress={() => router.push('/scanner')}
                    style={[
                      styles.row,
                      { backgroundColor: colors.bgElevated },
                      getCardShadow(scheme),
                    ]}>
                    <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                      <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[Typography.title3, styles.rowTitle, { color: colors.text }]}>
                        {pickup.businessName}
                      </Text>
                      <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                        {pickup.timeWindow} · {t('common.package', { count: pickup.packageCount })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </AnimatedPressable>
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
    gap: Spacing.mlg,
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  nextCard: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.xl,
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
  timeChip: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md - 4,
    overflow: 'hidden',
  },
  nextCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  packageCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  startButton: {
    paddingHorizontal: Spacing.xl,
  },
  startButtonLabel: {
    fontSize: 13,
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
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
});
