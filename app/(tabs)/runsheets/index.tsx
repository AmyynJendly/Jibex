import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { Card } from '../../../components/Card';
import { useConfirm } from '../../../components/ConfirmDialog';
import { CornerRibbon } from '../../../components/CornerRibbon';
import { EmptyState } from '../../../components/EmptyState';
import { LoadError } from '../../../components/LoadError';
import { MetaChip } from '../../../components/MetaChip';
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
  invalidateDeliveryData,
  useActiveParcels,
  useHistoryParcels,
  useRunsheets,
  useScreenState,
} from '../../../lib/query';
import { confirmRunsheetReceipt, logCallAttempt } from '../../../services/mock-api';
import type { Job, JobStatus, Runsheet } from '../../../types';

type Toggle = 'current' | 'history';
type HistoryFilter = 'all' | 'DELIVERED' | 'FAILED';

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
  /** Position in the driver's own order — blank in history, where order is meaningless. */
  stopNumber?: number;
  /** History cards drop the phone number, the call button and the drill-down. */
  readOnly?: boolean;
  /** Parcels on a run the driver hasn't signed for yet: visible, but inert. */
  locked?: boolean;
  onOpen?: () => void;
  onCall?: () => void;
  onUpdate?: () => void;
  updateLabel: string;
  callLabel: string;
  lockedLabel: string;
  t: TFunction;
}

function ParcelCard({
  job,
  colors,
  scheme,
  stopNumber,
  readOnly = false,
  locked = false,
  onOpen,
  onCall,
  onUpdate,
  updateLabel,
  callLabel,
  lockedLabel,
  t,
}: ParcelCardProps) {
  const hasCod = job.cashToCollect > 0;
  const accent = stateColor(job.status, colors);
  const inert = locked || readOnly;

  const body = (
    <>
      <CornerRibbon
        label={
          job.status === 'IN_TRANSIT'
            ? t('runsheets.inTransit')
            : enumLabel(t, 'jobStatus', job.status)
        }
        color={accent}
      />
      <View style={styles.cardHead}>
        {locked && (
          <View style={styles.lockSlot}>
            <Ionicons name="lock-closed" size={15} color={colors.textTertiary} />
          </View>
        )}
        {stopNumber !== undefined && (
          <View style={[styles.stopBadge, { backgroundColor: colors.bg }]}>
            <Text style={[monoStyle(12, 'medium'), { color: colors.textSecondary }]}>
              {stopNumber}
            </Text>
          </View>
        )}
        {/* The tracking number leads: it is the one field the driver reads
            off the parcel in their hand and matches against the screen. */}
        <View style={styles.cardHeadText}>
          <Text
            style={[styles.trackingId, { color: colors.text, backgroundColor: colors.bg }]}
            numberOfLines={1}>
            {job.id}
          </Text>
          <Text style={[styles.customerName, { color: colors.textSecondary }]} numberOfLines={1}>
            {job.customerName}
          </Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
        <Text
          style={[Typography.footnote, styles.addressText, { color: colors.textSecondary }]}
          numberOfLines={1}>
          {job.address}
        </Text>
        {!inert && (
          <View style={[styles.openWell, { backgroundColor: colors.bg }]}>
            <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
          </View>
        )}
      </View>

      {job.status === 'FAILED' && job.failureReason && (
        <Text style={[styles.failureText, { color: colors.danger }]} numberOfLines={1}>
          {enumLabel(t, 'failureReason', job.failureReason)}
        </Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.separator }]}>
        <MetaChip
          icon={hasCod ? 'cash-outline' : 'checkmark-circle-outline'}
          tone={hasCod ? 'accent' : 'success'}
          label={hasCod ? formatCurrency(job.cashToCollect) : t('runsheets.paidTag')}
        />

        {locked ? (
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
            <Text style={[styles.lockedText, { color: colors.textTertiary }]}>{lockedLabel}</Text>
          </View>
        ) : (
          <View style={styles.cardActions}>
            {!readOnly && onCall && (
              <AnimatedPressable
                scaleTo={0.9}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={callLabel}
                style={[styles.callButton, { backgroundColor: colors.accentSoft }]}
                onPress={onCall}>
                <Ionicons name="call-outline" size={17} color={colors.accent} />
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
                accessibilityRole="button"
                accessibilityLabel={`${updateLabel} ${job.id}`}
                style={[styles.updateButton, { backgroundColor: colors.accent }]}
                onPress={onUpdate}>
                <Ionicons name="sync-outline" size={14} color="#fff" />
                <Text style={styles.updateButtonText}>{updateLabel}</Text>
              </AnimatedPressable>
            )}
          </View>
        )}
      </View>
    </>
  );

  const card = (
    <Card accent={accent} gap={Spacing.xs} dimmed={locked}>
      {body}
    </Card>
  );

  // Locked and history cards are display surfaces, not controls.
  if (inert || !onOpen) return card;

  // Deliberately not accessibilityRole="button": this card contains Call and
  // Update, and a button inside a button is invalid markup and ambiguous to a
  // screen reader. The card's own text is read normally, and the two real
  // buttons inside it carry their own labels.
  return (
    <AnimatedPressable scaleTo={0.985} onPress={onOpen}>
      {card}
    </AnimatedPressable>
  );
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const activeQuery = useActiveParcels();
  const historyQuery = useHistoryParcels();
  const runsheetsQuery = useRunsheets();
  const screen = useScreenState([activeQuery, historyQuery, runsheetsQuery]);

  const active = activeQuery.data ?? null;
  const history = historyQuery.data ?? null;
  const runsheets = runsheetsQuery.data ?? [];
  const [toggle, setToggle] = useState<Toggle>('current');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sheetJob, setSheetJob] = useState<Job | null>(null);

  const unconfirmed = runsheets.filter((r) => r.needsConfirmation && r.status !== 'VALIDE');
  /** Parcels the driver hasn't signed for yet — inert until they do. */
  const lockedIds = new Set(unconfirmed.flatMap((r) => r.stopIds));

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

  async function handleCall(job: Job) {
    // Log first so the attempt is recorded even if the dialer never opens
    // (no telephony on web, or the driver backs out of the call sheet).
    await logCallAttempt(job.id);
    await invalidateDeliveryData();
    Linking.openURL(telUrl(job.customerPhone)).catch(() => {});
  }

  async function handleSheetDone() {
    setSheetJob(null);
    await invalidateDeliveryData();
  }

  const filteredHistory = (history ?? []).filter((j) =>
    filter === 'all' ? true : j.status === filter
  );
  const codTotal = (active ?? []).reduce((sum, j) => sum + j.cashToCollect, 0);

  const rows = toggle === 'current' ? (active ?? []) : filteredHistory;
  const pending = toggle === 'current' ? !active : !history;

  // Everything above the rows scrolls with them, so it lives in the list's
  // header rather than wrapping the list in a ScrollView — nesting the two
  // would hand scrolling back to the outer view and undo the virtualisation.
  const header = (
    <View style={styles.headerBlock}>
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
          {unconfirmed.map((runsheet) => {
            const isRecount = runsheet.status !== 'A_CONFIRMER';
            return (
              <View
                key={runsheet.id}
                style={[
                  styles.confirmCard,
                  { backgroundColor: colors.bgElevated, borderColor: colors.warning },
                  getCardShadow(scheme),
                ]}>
                <View style={styles.confirmHead}>
                  <View style={[styles.confirmIcon, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="lock-closed" size={16} color={colors.warning} />
                  </View>
                  <View style={styles.confirmHeadText}>
                    <Text style={[Typography.title3, { color: colors.text }]} numberOfLines={1}>
                      {isRecount
                        ? t('runsheets.confirm.recountTitle', { count: runsheet.stopCount })
                        : t('runsheets.confirm.title', { count: runsheet.stopCount })}
                    </Text>
                    <Text
                      style={[Typography.caption2, { color: colors.textSecondary }]}
                      numberOfLines={1}>
                      {runsheet.zone}
                    </Text>
                  </View>
                </View>

                <PrimaryButton
                  label={
                    isRecount
                      ? t('runsheets.confirm.recountAction')
                      : t('runsheets.confirm.action')
                  }
                  height={46}
                  onPress={() => handleConfirmReceipt(runsheet)}
                />
              </View>
            );
          })}

          {rows.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCell, { backgroundColor: colors.bgElevated }]}>
                <Text style={[monoStyle(20, 'medium'), { color: colors.text }]}>{rows.length}</Text>
                <Text style={[monoLabelStyle(9, 0.08), { color: colors.textTertiary }]}>
                  {t('runsheets.summary.toDeliver')}
                </Text>
              </View>
              <View style={[styles.summaryCell, { backgroundColor: colors.bgElevated }]}>
                <Text style={[monoStyle(20, 'medium'), { color: colors.accent }]}>
                  {formatCurrency(codTotal)}
                </Text>
                <Text style={[monoLabelStyle(9, 0.08), { color: colors.textTertiary }]}>
                  {t('runsheets.summary.toCollect')}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
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
      )}
    </View>
  );

  const empty = screen.isError ? (
    <LoadError onRetry={screen.retry} retrying={screen.retrying} />
  ) : pending ? (
    <View style={styles.skeletonGroup}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : (
    <EmptyState
      icon={toggle === 'current' ? 'checkmark-done-outline' : 'file-tray-outline'}
      title={toggle === 'current' ? t('runsheets.empty.current') : t('runsheets.empty.history')}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <FlashList
        data={rows}
        extraData={lockedIds}
        keyExtractor={(job) => job.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item: job, index }) => (
          <View style={styles.row}>
            <ParcelCard
              job={job}
              colors={colors}
              scheme={scheme}
              stopNumber={toggle === 'current' ? index + 1 : undefined}
              readOnly={toggle === 'history'}
              locked={lockedIds.has(job.id)}
              onOpen={
                toggle === 'current'
                  ? () => router.push({ pathname: '/job/[id]', params: { id: job.id } })
                  : undefined
              }
              onCall={toggle === 'current' ? () => handleCall(job) : undefined}
              onUpdate={() => setSheetJob(job)}
              updateLabel={t('runsheets.update')}
              callLabel={t('runsheets.call')}
              lockedLabel={t('runsheets.confirm.lockedTag')}
              t={t}
            />
          </View>
        )}
      />

      <StatusUpdateSheet job={sheetJob} onClose={() => setSheetJob(null)} onDone={handleSheetDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: {
    gap: Spacing.mlg,
    paddingBottom: Spacing.mlg,
  },
  row: {
    paddingBottom: Spacing.md,
  },
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
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  confirmHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  confirmIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmHeadText: {
    flex: 1,
    gap: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: -Spacing.xs,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.smd,
    borderRadius: Radii.lg,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
    // Clears the corner ribbon so a long name never runs under it.
    paddingRight: 64,
  },
  lockSlot: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cardHeadText: {
    flex: 1,
  },
  trackingId: {
    ...monoStyle(15, 'medium'),
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  customerName: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    marginTop: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.smd,
    minHeight: 32,
  },
  openWell: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    flex: 1,
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
    marginTop: 'auto',
    paddingTop: Spacing.smd,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingRight: Spacing.xs,
  },
  lockedText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callButton: {
    width: 42,
    height: 42,
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
    gap: 6,
    height: 42,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
  },
  updateButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
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
});
