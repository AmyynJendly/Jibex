import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AmbientGlow } from '../components/AmbientGlow';
import { PrimaryButton } from '../components/PrimaryButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { formatCurrency } from '../lib/currency';
import { localeTag } from '../lib/date';
import { confirmCashHandoff, endShift } from '../services/mock-api';
import type { ShiftSummary } from '../types';

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ShiftSummaryScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [handedOff, setHandedOff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag(i18n.language), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

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
          {t('shiftSummary.wrappingUp')}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.glowStage}>
          <View style={styles.glowLayer}>
            <AmbientGlow width={150} height={150} colors={['#0A5FFF', '#7C6FEE', '#1FAE5C']} />
          </View>
          <Animated.View
            entering={ZoomIn.springify(280).dampingRatio(1)}
            style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark-done" size={30} color={colors.accent} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(100).springify(220).dampingRatio(1)}>
          <Text style={[styles.title, { color: colors.text }]}>{t('shiftSummary.title')}</Text>
          <Text
            style={[Typography.callout, styles.timeRange, { color: colors.textSecondary }]}>
            {t('shiftSummary.timeRange', {
              start: formatTime(summary.startedAt),
              end: formatTime(summary.endedAt),
              duration: formatDuration(summary.durationMinutes),
            })}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(180).springify(220).dampingRatio(1)}
          style={[styles.statsGrid, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{summary.delivered}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('shiftSummary.stats.delivered')}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{summary.failed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('shiftSummary.stats.failed')}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {summary.distanceMiles}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('shiftSummary.stats.miles')}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(240).springify(220).dampingRatio(1)}
          style={[styles.cashCard, { backgroundColor: colors.successSoft }]}>
          <View style={styles.cashLeft}>
            <Text style={[styles.cashLabel, { color: colors.text }]}>
              {t('shiftSummary.cashToHandOff')}
            </Text>
            <Text style={[styles.cashAmount, { color: colors.text }]}>
              {formatCurrency(summary.cashCollected)}
            </Text>
          </View>
          {handedOff ? (
            <View style={styles.handedOffBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.handedOffText, { color: colors.success }]}>
                {t('shiftSummary.handedOff')}
              </Text>
            </View>
          ) : (
            <PrimaryButton
              label={t('shiftSummary.confirm')}
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
        <PrimaryButton
          label={t('shiftSummary.done')}
          height={56}
          onPress={() => router.replace('/(tabs)/home')}
        />
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
  glowStage: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -Spacing.xxl,
  },
  glowLayer: {
    position: 'absolute',
    width: 150,
    height: 150,
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
