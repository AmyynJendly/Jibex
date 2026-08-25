import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useConfirm } from '../../../components/ConfirmDialog';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressBar } from '../../../components/ProgressBar';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import { StatusUpdateSheet } from '../../../components/StatusUpdateSheet';
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
import { confirmRunsheetReceipt, getRunsheet, getRunsheetJobs } from '../../../services/mock-api';
import type { Job, Runsheet, RunsheetStatus } from '../../../types';

const STAGGER_MS = 40;

function statusColors(status: RunsheetStatus, colors: ColorPalette) {
  switch (status) {
    case 'VALIDE':
      return { color: colors.success, background: colors.successSoft };
    case 'A_CONFIRMER':
      return { color: colors.warning, background: colors.warningSoft };
    case 'EN_COURS':
    default:
      return { color: colors.accent, background: colors.accentSoft };
  }
}

export default function RunsheetDetailScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { id } = useLocalSearchParams<{ id: string }>();
  const [runsheet, setRunsheet] = useState<Runsheet | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [sheetJob, setSheetJob] = useState<Job | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const [r, j] = await Promise.all([getRunsheet(id), getRunsheetJobs(id)]);
    setRunsheet(r);
    setJobs(j);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleConfirmReceipt() {
    if (!runsheet || confirming) return;
    const confirmed = await confirm({
      title: t('runsheetDetail.confirmModalTitle'),
      message: t('runsheetDetail.confirmModalMessage', { count: runsheet.stopCount }),
      confirmLabel: t('runsheetDetail.confirmReceipt'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    setConfirming(true);
    await confirmRunsheetReceipt(runsheet.id);
    await load();
    setConfirming(false);
    showToast(t('runsheetDetail.confirmedToast'));
  }

  async function handleFailed() {
    setSheetJob(null);
    await load();
    showToast(t('statusUpdate.failedToast'));
  }

  if (!runsheet || !jobs) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
        <View style={styles.backRow}>
          <GlassIconButton onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </GlassIconButton>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={80} radius={Radii.card} />
          <SkeletonBlock height={110} radius={Radii.card} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sc = statusColors(runsheet.status, colors);
  const isBlocked = runsheet.status === 'A_CONFIRMER';
  const delivered = jobs.filter((j) => j.status === 'DELIVERED').length;
  const failed = jobs.filter((j) => j.status === 'FAILED').length;
  const remaining = jobs.length - delivered - failed;
  const completionPercent = jobs.length === 0 ? 0 : Math.round((delivered / jobs.length) * 100);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.backRow}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          entering={FadeInUp.springify(220).dampingRatio(1)}
          style={[styles.headerCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.headerCardText}>
            <Text style={[Typography.title3, { color: colors.text }]}>{runsheet.routeLabel}</Text>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]} numberOfLines={1}>
              {runsheet.agency} · {runsheet.id}
            </Text>
          </View>
          <Text style={[styles.statusPill, { color: sc.color, backgroundColor: sc.background }]} numberOfLines={1}>
            {enumLabel(t, 'runsheetStatus', runsheet.status)}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(STAGGER_MS).springify(220).dampingRatio(1)}
          style={[styles.statsCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[monoStyle(22, 'medium'), { color: colors.success }]}>{delivered}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {t('runsheetDetail.stats.delivered')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[monoStyle(22, 'medium'), { color: colors.danger }]}>{failed}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {t('runsheetDetail.stats.failed')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[monoStyle(22, 'medium'), { color: colors.text }]}>{remaining}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {t('runsheetDetail.stats.remaining')}
              </Text>
            </View>
          </View>
          <ProgressBar percent={completionPercent} color={sc.color} style={styles.progressBar} />
        </Animated.View>

        {isBlocked && (
          <Animated.View
            entering={FadeInUp.delay(STAGGER_MS * 2).springify(220).dampingRatio(1)}
            style={[styles.blockedCard, { backgroundColor: colors.warningSoft }]}>
            <View style={styles.blockedTextRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
              <Text style={[Typography.footnote, styles.blockedText, { color: colors.text }]}>
                {t('runsheetDetail.blockedNotice')}
              </Text>
            </View>
            <PrimaryButton
              label={t('runsheetDetail.confirmReceipt')}
              height={48}
              loading={confirming}
              onPress={handleConfirmReceipt}
            />
          </Animated.View>
        )}

        <Text style={[monoLabelStyle(11, 0.06), styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('runsheetDetail.parcelsTitle', { count: jobs.length })}
        </Text>

        {jobs.length === 0 ? (
          <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
            {t('runsheetDetail.empty')}
          </Text>
        ) : (
          <View style={styles.parcelList}>
            {jobs.map((job, i) => {
              const isDelivered = job.status === 'DELIVERED';
              const isFailed = job.status === 'FAILED';
              const canUpdate = !isBlocked && !isDelivered && !isFailed;
              const hasCod = job.cashToCollect > 0;
              return (
                <Animated.View
                  key={job.id}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
                  style={[
                    styles.parcelCard,
                    { backgroundColor: colors.bgElevated, opacity: isDelivered ? 0.7 : 1 },
                    getCardShadow(scheme),
                  ]}>
                  <AnimatedPressable
                    scaleTo={0.98}
                    onPress={() => router.push(`/job/${job.id}`)}
                    style={styles.parcelTopRow}>
                    <View style={styles.parcelText}>
                      <Text style={[monoStyle(11, 'medium'), { color: colors.textTertiary }]}>
                        {job.id}
                      </Text>
                      <Text
                        style={[Typography.body, styles.parcelName, { color: colors.text }]}
                        numberOfLines={1}>
                        {job.customerName}
                      </Text>
                      <Text
                        style={[Typography.footnote, { color: colors.textSecondary }]}
                        numberOfLines={1}>
                        {job.address}
                      </Text>
                      {isFailed && job.failureReason && (
                        <Text style={[styles.failureText, { color: colors.danger }]}>
                          {enumLabel(t, 'failureReason', job.failureReason)}
                        </Text>
                      )}
                    </View>
                    {hasCod ? (
                      <Text
                        style={[styles.codBadge, { color: colors.accent, backgroundColor: colors.accentSoft }]}
                        numberOfLines={1}>
                        {formatCurrency(job.cashToCollect)}
                      </Text>
                    ) : (
                      <Text
                        style={[styles.codBadge, { color: colors.success, backgroundColor: colors.successSoft }]}
                        numberOfLines={1}>
                        {t('runsheets.paidTag')}
                      </Text>
                    )}
                  </AnimatedPressable>

                  <View style={[styles.parcelActionsRow, { borderTopColor: colors.separator }]}>
                    <AnimatedPressable
                      scaleTo={0.88}
                      style={[styles.callButton, { backgroundColor: colors.accentSoft }]}
                      onPress={() => Linking.openURL(telUrl(job.customerPhone))}>
                      <Ionicons name="call-outline" size={16} color={colors.accent} />
                    </AnimatedPressable>
                    {canUpdate ? (
                      <AnimatedPressable
                        scaleTo={0.95}
                        style={[styles.majButton, { backgroundColor: colors.accent }]}
                        onPress={() => setSheetJob(job)}>
                        <Ionicons name="sync-outline" size={13} color="#fff" />
                        <Text style={styles.majButtonText}>{t('runsheetDetail.update')}</Text>
                      </AnimatedPressable>
                    ) : (
                      <Text
                        style={[
                          styles.resolvedStatus,
                          { color: isDelivered ? colors.success : isFailed ? colors.danger : colors.textTertiary },
                        ]}>
                        {job.status === 'IN_TRANSIT'
                          ? t('runsheets.onRoute')
                          : enumLabel(t, 'jobStatus', job.status)}
                      </Text>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <StatusUpdateSheet job={sheetJob} onClose={() => setSheetJob(null)} onFailed={handleFailed} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backRow: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    gap: Spacing.mlg,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerCardText: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  statsCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  progressBar: {
    marginTop: 2,
  },
  blockedCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  blockedTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  blockedText: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: Spacing.xs,
  },
  parcelList: {
    gap: Spacing.md,
  },
  parcelCard: {
    borderRadius: Radii.xxl,
    overflow: 'hidden',
  },
  parcelTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.smd,
    padding: Spacing.lg,
  },
  parcelText: {
    flex: 1,
    gap: 2,
  },
  parcelName: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
    marginTop: 1,
  },
  failureText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  codBadge: {
    ...monoStyle(12, 'medium'),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  parcelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  majButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  majButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
    color: '#fff',
  },
  resolvedStatus: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
});
