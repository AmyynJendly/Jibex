import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useConfirm } from '../../../components/ConfirmDialog';
import { CornerRibbon } from '../../../components/CornerRibbon';
import { DraggableList } from '../../../components/DraggableList';
import { EmptyState } from '../../../components/EmptyState';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { SkeletonRow } from '../../../components/Skeleton';
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
import {
  confirmRunsheetReceipt,
  getActiveParcels,
  getHistoryParcels,
  getRunsheets,
  logCallAttempt,
  setParcelOrder,
} from '../../../services/mock-api';
import type { Job, JobStatus, Runsheet } from '../../../types';

type Toggle = 'current' | 'history';
type HistoryFilter = 'all' | 'DELIVERED' | 'FAILED';

/** Card height + the gap beneath it — `DraggableList` needs a fixed row pitch. */
const ROW_HEIGHT = 150;

/** One colour per parcel state, drawn from the Sunlit palette. */
function stateColor(status: JobStatus, colors: ColorPalette) {
  switch (status) {
    case 'DELIVERED':
      return colors.success;
    case 'FAILED':
      return colors.danger;
    case 'IN_TRANSIT':
      return colors.info;
    case 'PENDING':
    default:
      return colors.warning;
  }
}

interface ParcelCardProps {
  job: Job;
  colors: ColorPalette;
  scheme: 'light' | 'dark';
  /** History cards drop the phone number and the call button. */
  readOnly?: boolean;
  onCall?: () => void;
  onUpdate?: () => void;
  updateLabel: string;
  callLabel: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ParcelCard({
  job,
  colors,
  scheme,
  readOnly = false,
  onCall,
  onUpdate,
  updateLabel,
  callLabel,
  t,
}: ParcelCardProps) {
  const hasCod = job.cashToCollect > 0;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
      <CornerRibbon
        label={
          job.status === 'IN_TRANSIT'
            ? t('runsheets.onRoute')
            : enumLabel(t as never, 'jobStatus', job.status)
        }
        color={stateColor(job.status, colors)}
      />

      <Text style={[monoStyle(11, 'medium'), { color: colors.textTertiary }]}>{job.id}</Text>
      <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
        {job.customerName}
      </Text>
      <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
        {job.address}
      </Text>
      {job.status === 'FAILED' && job.failureReason && (
        <Text style={[styles.failureText, { color: colors.danger }]} numberOfLines={1}>
          {enumLabel(t as never, 'failureReason', job.failureReason)}
        </Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.separator }]}>
        <Text
          style={[
            styles.codBadge,
            hasCod
              ? { color: colors.accent, backgroundColor: colors.accentSoft }
              : { color: colors.success, backgroundColor: colors.successSoft },
          ]}
          numberOfLines={1}>
          {hasCod ? formatCurrency(job.cashToCollect) : t('runsheets.paidTag')}
        </Text>

        <View style={styles.cardActions}>
          {!readOnly && onCall && (
            <AnimatedPressable
              scaleTo={0.9}
              style={[styles.callButton, { backgroundColor: colors.accentSoft }]}
              onPress={onCall}>
              <Ionicons name="call-outline" size={15} color={colors.accent} />
              {job.callAttempts > 0 && (
                <View style={[styles.callBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.callBadgeText}>{job.callAttempts}</Text>
                </View>
              )}
            </AnimatedPressable>
          )}
          {onUpdate && (
            <AnimatedPressable
              scaleTo={0.95}
              style={[styles.updateButton, { backgroundColor: colors.accent }]}
              onPress={onUpdate}>
              <Ionicons name="sync-outline" size={13} color="#fff" />
              <Text style={styles.updateButtonText}>{updateLabel}</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
      {!readOnly && <Text style={styles.srOnly}>{callLabel}</Text>}
    </View>
  );
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const [active, setActive] = useState<Job[] | null>(null);
  const [history, setHistory] = useState<Job[] | null>(null);
  const [runsheets, setRunsheets] = useState<Runsheet[]>([]);
  const [toggle, setToggle] = useState<Toggle>('current');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sheetJob, setSheetJob] = useState<Job | null>(null);

  const load = useCallback(async () => {
    const [a, h, r] = await Promise.all([getActiveParcels(), getHistoryParcels(), getRunsheets()]);
    setActive(a);
    setHistory(h);
    setRunsheets(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unconfirmed = runsheets.filter((r) => r.needsConfirmation && r.status !== 'VALIDE');

  async function handleConfirmReceipt(runsheet: Runsheet) {
    const isRecount = runsheet.status !== 'A_CONFIRMER';
    const confirmed = await confirm({
      title: isRecount ? t('runsheetDetail.recountTitle') : t('runsheetDetail.confirmModalTitle'),
      message: isRecount
        ? t('runsheetDetail.recountMessage', { count: runsheet.stopCount })
        : t('runsheetDetail.confirmModalMessage', { count: runsheet.stopCount }),
      confirmLabel: isRecount
        ? t('runsheetDetail.reconfirmReceipt')
        : t('runsheetDetail.confirmReceipt'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    await confirmRunsheetReceipt(runsheet.id);
    await load();
    showToast(t('runsheetDetail.confirmedToast'));
  }

  async function handleCall(job: Job) {
    // Log first so the attempt is recorded even if the dialer never opens
    // (no telephony on web, or the driver backs out of the call sheet).
    await logCallAttempt(job.id);
    await load();
    Linking.openURL(telUrl(job.customerPhone)).catch(() => {});
  }

  async function handleReorder(orderedIds: string[]) {
    await setParcelOrder(orderedIds);
    showToast(t('runsheets.reorderedToast'));
    await load();
  }

  async function handleSheetDone() {
    setSheetJob(null);
    await load();
  }

  const filteredHistory = (history ?? []).filter((j) =>
    filter === 'all' ? true : j.status === filter
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
          {t('runsheets.headerTitle')}
        </Text>

        <SegmentedControl
          segments={[
            { value: 'current', label: t('runsheets.toggleCurrent') },
            { value: 'history', label: t('runsheets.toggleHistory') },
          ]}
          value={toggle}
          onChange={setToggle}
        />

        {toggle === 'current' ? (
          <>
            {unconfirmed.map((runsheet) => (
              <View
                key={runsheet.id}
                style={[styles.confirmCard, { backgroundColor: colors.warningSoft }]}>
                <View style={styles.confirmTextRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
                  <Text style={[Typography.footnote, styles.confirmText, { color: colors.text }]}>
                    {runsheet.status === 'A_CONFIRMER'
                      ? t('runsheetDetail.blockedNotice')
                      : t('runsheetDetail.recountMessage', { count: runsheet.stopCount })}
                  </Text>
                </View>
                <PrimaryButton
                  label={
                    runsheet.status === 'A_CONFIRMER'
                      ? t('runsheetDetail.confirmReceipt')
                      : t('runsheetDetail.reconfirmReceipt')
                  }
                  height={46}
                  onPress={() => handleConfirmReceipt(runsheet)}
                />
              </View>
            ))}

            {!active ? (
              <View style={styles.skeletonGroup}>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </View>
            ) : active.length === 0 ? (
              <EmptyState icon="checkmark-done-outline" title={t('runsheets.empty.current')} />
            ) : (
              <>
                <View style={styles.listHeader}>
                  <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
                    {t('runsheets.parcelsTitle', { count: active.length })}
                  </Text>
                </View>
                <View style={styles.reorderHintRow}>
                  <Ionicons name="reorder-two" size={16} color={colors.textTertiary} />
                  <Text style={[Typography.caption2, { color: colors.textTertiary }]}>
                    {t('runsheets.reorderHint')}
                  </Text>
                </View>

                <DraggableList
                  data={active}
                  idOf={(job) => job.id}
                  itemHeight={ROW_HEIGHT}
                  onReorder={handleReorder}
                  renderItem={(job) => (
                    <ParcelCard
                      job={job}
                      colors={colors}
                      scheme={scheme}
                      onCall={() => handleCall(job)}
                      onUpdate={() => setSheetJob(job)}
                      updateLabel={t('runsheetDetail.update')}
                      callLabel={t('runsheets.call')}
                      t={t as never}
                    />
                  )}
                />
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.filterRow}>
              {(['all', 'DELIVERED', 'FAILED'] as HistoryFilter[]).map((value) => {
                const selected = filter === value;
                const label =
                  value === 'all'
                    ? t('runsheets.filters.all')
                    : value === 'DELIVERED'
                      ? t('runsheets.filters.delivered')
                      : t('runsheets.filters.failed');
                return (
                  <AnimatedPressable
                    key={value}
                    scaleTo={0.95}
                    onPress={() => setFilter(value)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? colors.accent : colors.bgElevated,
                        borderColor: selected ? colors.accent : colors.separator,
                      },
                    ]}>
                    <Text
                      style={[styles.filterChipText, { color: selected ? '#fff' : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {!history ? (
              <View style={styles.skeletonGroup}>
                <SkeletonRow />
                <SkeletonRow />
              </View>
            ) : filteredHistory.length === 0 ? (
              <EmptyState icon="file-tray-outline" title={t('runsheets.empty.history')} />
            ) : (
              <View style={styles.historyList}>
                {filteredHistory.map((job) => (
                  <ParcelCard
                    key={job.id}
                    job={job}
                    colors={colors}
                    scheme={scheme}
                    readOnly
                    onUpdate={() => setSheetJob(job)}
                    updateLabel={t('runsheetDetail.update')}
                    callLabel={t('runsheets.call')}
                    t={t as never}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <StatusUpdateSheet job={sheetJob} onClose={() => setSheetJob(null)} onDone={handleSheetDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.mlg,
  },
  headerTitle: { fontSize: 26 },
  skeletonGroup: { gap: Spacing.md },
  confirmCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  confirmTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  confirmText: { flex: 1 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -Spacing.sm,
  },
  reorderHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: -Spacing.xs,
  },
  historyList: { gap: Spacing.md },
  card: {
    flex: 1,
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: 2,
    overflow: 'hidden',
  },
  customerName: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
    marginTop: 1,
    paddingRight: 70,
  },
  failureText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  codBadge: {
    ...monoStyle(12, 'medium'),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBadgeText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 10,
    color: '#fff',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  updateButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  // Keeps the call action labelled for screen readers without adding visible chrome.
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
