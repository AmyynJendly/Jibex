import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { PrimaryButton } from '../components/PrimaryButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { confirmCashHandoff, endShift } from '../services/mock-api';
import type { ShiftSummary } from '../types';

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ShiftSummaryScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [handedOff, setHandedOff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    endShift().then(setSummary);
  }, []);

  async function handleConfirmHandoff() {
    if (submitting) return;
    setSubmitting(true);
    await confirmCashHandoff();
    setSubmitting(false);
    setHandedOff(true);
  }

  if (!summary) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>
          Wrapping up your shift…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Animated.View
          entering={ZoomIn.springify(280).dampingRatio(1)}
          style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="checkmark-done" size={30} color={colors.accent} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify(220).dampingRatio(1)}>
          <Text style={[styles.title, { color: colors.text }]}>Shift Complete</Text>
          <Text
            style={[Typography.callout, styles.timeRange, { color: colors.textSecondary }]}>
            {formatTime(summary.startedAt)} – {formatTime(summary.endedAt)} ·{' '}
            {formatDuration(summary.durationMinutes)}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(180).springify(220).dampingRatio(1)}
          style={[styles.statsGrid, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{summary.delivered}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Delivered</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{summary.failed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Failed</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {summary.distanceMiles}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Miles</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(240).springify(220).dampingRatio(1)}
          style={[styles.cashCard, { backgroundColor: colors.successSoft }]}>
          <View style={styles.cashLeft}>
            <Text style={[styles.cashLabel, { color: colors.text }]}>Cash to hand off</Text>
            <Text style={[styles.cashAmount, { color: colors.text }]}>
              {summary.cashCollected.toFixed(2)} DT
            </Text>
          </View>
          {handedOff ? (
            <View style={styles.handedOffBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.handedOffText, { color: colors.success }]}>Handed Off</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Confirm"
              height={40}
              loading={submitting}
              onPress={handleConfirmHandoff}
              style={styles.handoffButton}
              labelStyle={styles.handoffLabel}
            />
          )}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Done" height={56} onPress={() => router.replace('/(tabs)/home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.xl,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.02 * 26,
    textAlign: 'center',
  },
  timeRange: {
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.card,
    paddingVertical: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cashCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
  },
  cashLeft: {
    gap: 2,
  },
  cashLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  cashAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  handoffButton: {
    paddingHorizontal: Spacing.xl,
  },
  handoffLabel: {
    fontSize: 14,
  },
  handedOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  handedOffText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: 30,
  },
});
