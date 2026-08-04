import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { getPickups } from '../services/mock-api';
import type { Pickup, PickupStatus } from '../types';

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export default function PickupsScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pickups, setPickups] = useState<Pickup[] | null>(null);
  const [segment, setSegment] = useState<PickupStatus>('scheduled');

  useEffect(() => {
    getPickups().then(setPickups);
  }, []);

  if (!pickups) {
    return (
      <SafeAreaView style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const scheduled = pickups.filter((p) => p.status === 'scheduled');
  const completed = pickups.filter((p) => p.status === 'completed');
  const nextPickup = segment === 'scheduled' ? scheduled[0] : undefined;
  const restPickups = segment === 'scheduled' ? scheduled.slice(1) : completed;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Pickups</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={segment}
          onChange={setSegment}
        />

        {nextPickup && (
          <View
            style={[
              styles.nextCard,
              { backgroundColor: colors.bgElevated, borderColor: colors.accent },
              getCardShadow(scheme),
            ]}>
            <View style={styles.nextCardTopRow}>
              <Text style={[styles.nextCardLabel, { color: colors.accent }]}>Next Pickup</Text>
              <Text
                style={[styles.timeChip, { color: colors.text, backgroundColor: colors.separator }]}>
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
                {pluralize(nextPickup.packageCount, 'package')}
              </Text>
              <PrimaryButton
                label="Start Pickup"
                onPress={() => router.push('/scanner')}
                height={38}
                style={styles.startButton}
                labelStyle={styles.startButtonLabel}
              />
            </View>
          </View>
        )}

        {restPickups.length === 0 && !nextPickup ? (
          <Text style={[Typography.body, styles.empty, { color: colors.textSecondary }]}>
            No {segment} pickups.
          </Text>
        ) : (
          restPickups.map((pickup) => (
            <Pressable
              key={pickup.id}
              onPress={() => router.push('/scanner')}
              style={[styles.row, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.title3, styles.rowTitle, { color: colors.text }]}>
                  {pickup.businessName}
                </Text>
                <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                  {pickup.timeWindow} · {pluralize(pickup.packageCount, 'package')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  empty: {
    textAlign: 'center',
    paddingTop: Spacing.xxl,
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
