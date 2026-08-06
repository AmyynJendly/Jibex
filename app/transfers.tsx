import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SkeletonRow } from '../components/Skeleton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { getTransfers } from '../services/mock-api';
import type { Transfer } from '../types';

const STAGGER_MS = 40;

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function TransfersScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);

  useEffect(() => {
    getTransfers().then(setTransfers);
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Transfers</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!transfers ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {transfers.length === 0 && (
            <EmptyState icon="swap-horizontal-outline" title="No transfers in progress" />
          )}
          {transfers.map((transfer, i) => {
            const completed = transfer.status === 'completed';
            const statusColor = completed ? colors.success : colors.accent;
            const statusSoft = completed ? colors.successSoft : colors.accentSoft;
            return (
              <Animated.View
                key={transfer.id}
                entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.bgElevated, opacity: completed ? 0.6 : 1 },
                    getCardShadow(scheme),
                  ]}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.routeLabel, { color: colors.text }]}>
                      {transfer.origin}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                    <Text style={[styles.routeLabel, { color: colors.text }]}>
                      {transfer.destination}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text
                      style={[styles.statusChip, { color: statusColor, backgroundColor: statusSoft }]}>
                      {completed ? 'Completed' : 'Awaiting Handoff'}
                    </Text>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                    {pluralize(transfer.itemCount, 'package')} · {transfer.location} ·{' '}
                    {formatTime(transfer.scheduledAt)}
                  </Text>
                </View>
              </Animated.View>
            );
          })}

          <PrimaryButton
            label="Initiate Transfer"
            onPress={() => router.push('/scanner')}
            height={54}
            style={styles.initiateButton}
          />
        </ScrollView>
      )}
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
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: Spacing.smd,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  initiateButton: {
    marginTop: Spacing.smd,
  },
});
