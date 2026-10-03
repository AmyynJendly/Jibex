import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Icon } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { Card } from '../../../components/Card';
import { CornerRibbon } from '../../../components/CornerRibbon';
import { DragHandle, DraggableList, type DragBinding } from '../../../components/DraggableList';
import { EmptyState } from '../../../components/EmptyState';
import { NativeSwitch } from '../../../components/NativeSwitch';
import { TrackingId } from '../../../components/TrackingId';
import { LoadError } from '../../../components/LoadError';
import { MetaChip } from '../../../components/MetaChip';
import { RunsheetDayCard } from '../../../components/RunsheetDayCard';
import { ScrollToTopButton, useScrollToTop } from '../../../components/ScrollToTopButton';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { SkeletonRow } from '../../../components/Skeleton';
import { StatusUpdateSheet } from '../../../components/StatusUpdateSheet';
import { StopLink } from '../../../components/StopLink';
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
import { attemptInfo, attemptLabel } from '../../../lib/attempts';
import { CURRENCY_DECIMALS, formatCurrency, formatDecimal } from '../../../lib/currency';
import { toDateKey } from '../../../lib/date';
import { enumLabel } from '../../../lib/enumLabel';
import { errorKeyOf } from '../../../lib/errors';
import { shownFailureReason } from '../../../lib/failureReasons';
import { historyAttempts, historyRecordLine } from '../../../lib/historyRecord';
import { notableParcelStatus, parcelStatusLabel } from '../../../lib/parcelStatus';
import { parcelRowKeys } from '../../../lib/rowKey';
import { dayRuns, lockedStopIds, runStage } from '../../../lib/runsheetDay';
import { callCustomer } from '../../../lib/stopActions';
import { useAutoRefresh } from '../../../lib/useAutoRefresh';
import { usePullToRefresh } from '../../../lib/usePullToRefresh';
import { useFocusHighlight, useTabSegment } from '../../../lib/useFocusHighlight';
import {
  invalidateDeliveryData,
  useActiveParcels,
  useClosedRunsheetsToday,
  useDriverPosition,
  useHistoryParcels,
  useNearestFirst,
  useRunsheets,
  useScreenState,
} from '../../../lib/query';
import { setNearestFirst, setStopOrder } from '../../../services/api';
import type { Job, JobStatus } from '../../../types';

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
  /**
   * History only: the parcel's run is closed, so it can't be changed any
   * more. Shown as a lock and this label where the Update button would be.
   */
  closedLabel?: string;
  /** Present only for a workable stop in the current tab — spreads onto `DragHandle`. */
  drag?: DragBinding;
  /** Tapping the card opens its stop screen, zooming out of the card on iOS. */
  opensStop?: boolean;
  onCall?: () => void;
  onUpdate?: () => void;
  updateLabel: string;
  callLabel: string;
  lockedLabel: string;
  /** Arrived here from a notification about this parcel. */
  highlighted?: boolean;
  /** History only: run code, day and attempt — what tells two records of one parcel apart. */
  recordLine?: string;
  /** Added by the agency after the driver accepted the run: stands out until they accept it. */
  isNew?: boolean;
  t: TFunction;
}

function ParcelCard({
  job,
  colors,
  scheme,
  stopNumber,
  readOnly = false,
  locked = false,
  closedLabel,
  drag,
  opensStop = false,
  onCall,
  onUpdate,
  updateLabel,
  callLabel,
  lockedLabel,
  highlighted = false,
  recordLine,
  isNew = false,
  t,
}: ParcelCardProps) {
  const hasCod = job.cashToCollect > 0;
  const accent = stateColor(job.status, colors);
  const inert = locked || readOnly;
  const notableStatus = notableParcelStatus(job.server?.parcelStatus);
  const attempt = attemptInfo(job.deliveryAttempts);
  // History rows are a record of what happened, not a parcel still to
  // deliver: they keep the exchange mark, not the attempt count.
  const showAttempt = !readOnly && attempt.number > 1;
  const showBadges = showAttempt || !!job.exchange || isNew;
  const failureReason = shownFailureReason(job);

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
        {drag && !locked && <DragHandle drag={drag} />}
        {locked && (
          <View style={styles.lockSlot}>
            <Icon name="lock-closed" size={15} color={colors.textTertiary} />
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
          <TrackingId value={job.id} />
          <Text style={[styles.customerName, { color: colors.textSecondary }]} numberOfLines={1}>
            {job.customerName}
          </Text>
        </View>
      </View>

      {recordLine ? (
        <Text style={[styles.recordLine, { color: colors.textSecondary }]} numberOfLines={1}>
          {recordLine}
        </Text>
      ) : null}

      <View style={styles.addressRow}>
        <Icon name="location-outline" size={15} color={colors.textSecondary} />
        <Text
          style={[Typography.footnote, styles.addressText, { color: colors.textSecondary }]}
          numberOfLines={1}>
          {job.address}
        </Text>
        {/* Only while "Nearest first" sorted the list. Measured to the
            governorate's centre unless the parcel had real coordinates. */}
        {job.distanceKm !== undefined && (
          <Text style={[monoStyle(11, 'medium'), { color: colors.textSecondary }]} numberOfLines={1}>
            {job.distanceApprox
              ? t('runsheets.distanceApprox', { km: Math.round(job.distanceKm) })
              : t('runsheets.distanceExact', { km: formatDecimal(job.distanceKm) })}
          </Text>
        )}
        {!inert && (
          <View style={[styles.openWell, { backgroundColor: colors.bg }]}>
            <Icon name="chevron-forward" size={15} color={colors.textSecondary} />
          </View>
        )}
      </View>

      {/* A second attempt or later is said on the card, so the driver knows
          before opening it. A first attempt is the normal case and says nothing. */}
      {showBadges && (
        <View style={styles.badgeRow}>
          {isNew && <MetaChip icon="add-circle-outline" tone="warning" label={t('runsheets.day.newParcel')} />}
          {job.exchange && <MetaChip icon="swap-horizontal-outline" tone="warning" label={t('exchange.badge')} />}
          {showAttempt && (
            <MetaChip
              icon={attempt.last ? 'warning' : 'sync-outline'}
              tone={attempt.last ? 'warning' : 'neutral'}
              label={attempt.last ? `${attemptLabel(t, attempt)} · ${t('attempts.last')}` : attemptLabel(t, attempt)}
            />
          )}
        </View>
      )}

      {failureReason && (
        <Text style={[styles.failureText, { color: colors.danger }]} numberOfLines={1}>
          {enumLabel(t, 'failureReason', failureReason)}
        </Text>
      )}

      {/* What happened to the parcel since: back at the depot, with the
          after-sales desk, at a relay depot. Only when it adds something. */}
      {notableStatus && (
        <Text style={[styles.parcelStatusText, { color: colors.textSecondary }]} numberOfLines={1}>
          {t('runsheets.parcelStatusLine', { status: parcelStatusLabel(t, notableStatus) })}
        </Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.separator }]}>
        <MetaChip
          icon={hasCod ? 'cash-outline' : 'checkmark-circle-outline'}
          tone={hasCod ? 'accent' : 'success'}
          label={hasCod ? formatCurrency(job.cashToCollect) : t('runsheets.paidTag')}
        />

        {locked || closedLabel ? (
          <View style={styles.lockedRow}>
            <Icon name="lock-closed-outline" size={13} color={colors.textTertiary} />
            <Text style={[styles.lockedText, { color: colors.textTertiary }]}>
              {closedLabel ?? lockedLabel}
            </Text>
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
                <Icon name="call-outline" size={17} color={colors.accent} />
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
                <Icon name="sync-outline" size={14} color="#fff" />
                <Text style={styles.updateButtonText}>{updateLabel}</Text>
              </AnimatedPressable>
            )}
          </View>
        )}
      </View>
    </>
  );

  const card = (
    <Card
      accent={accent}
      gap={Spacing.xs}
      // A new parcel is the one thing to look at on a changed run: not greyed.
      dimmed={locked && !isNew}
      borderColor={highlighted ? colors.accent : isNew ? colors.warning : undefined}>
      {body}
    </Card>
  );

  // Locked and history cards are display surfaces, not controls.
  if (inert || !opensStop) return card;

  // Deliberately not accessibilityRole="button": this card contains Call and
  // Update, and a button inside a button is invalid markup and ambiguous to a
  // screen reader. The card's own text is read normally, and the two real
  // buttons inside it carry their own labels.
  //
  return (
    <StopLink job={job} scaleTo={0.985}>
      {card}
    </StopLink>
  );
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const activeQuery = useActiveParcels();
  const historyQuery = useHistoryParcels();
  const runsheetsQuery = useRunsheets();
  const closedTodayQuery = useClosedRunsheetsToday();
  const nearestFirstQuery = useNearestFirst();
  const screen = useScreenState([activeQuery, historyQuery, runsheetsQuery]);

  const active = activeQuery.data ?? null;
  const history = historyQuery.data ?? null;
  const runsheets = runsheetsQuery.data ?? [];
  const nearestFirst = nearestFirstQuery.data ?? true;
  // Why "Nearest first" couldn't sort, if it couldn't (no permission, no fix).
  const positionProblem = useDriverPosition(nearestFirst).data?.problem;
  // Opened from a notification, the screen lands on the side that alert is
  // about — a refusal belongs in history, not on the current run.
  const [toggle, setToggle] = useTabSegment<Toggle>(['current', 'history'], 'current');
  // The agency changes the day from its side (a new run, a parcel added) and
  // nothing is pushed to the phone: reload when Current comes into view, and
  // every minute while it stays there.
  // Never in the middle of a drag: a reload would re-lay the list under the
  // driver's finger.
  const draggingRef = useRef(false);
  const refreshUnlessDragging = useCallback(
    () => (draggingRef.current ? undefined : invalidateDeliveryData()),
    []
  );
  useAutoRefresh(refreshUnlessDragging, toggle === 'current');
  const refresh = usePullToRefresh(invalidateDeliveryData);
  const highlightedId = useFocusHighlight();
  // A plain FlatList: every card is sized to its own content. FlashList
  // re-used cells across the filters and kept a taller card's height,
  // leaving large gaps between cards.
  const listRef = useRef<FlatList<Job>>(null);
  const currentRef = useRef<ScrollView>(null);
  const toTop = useScrollToTop();
  const insets = useSafeAreaInsets();
  // Clears the floating tab bar.
  const toTopBottom = insets.bottom + 72;
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sheetJob, setSheetJob] = useState<Job | null>(null);
  // The active list itself follows the finger during a drag, so the
  // ScrollView around it has to step aside or the two fight over the touch.
  const [dragging, setDragging] = useState(false);

  // The run of the day. Once the agency closes it, it leaves the open list:
  // it is then shown as closed, instead of an empty "nothing left" screen.
  const today = toDateKey(new Date());
  const day = dayRuns(runsheets, closedTodayQuery.data ?? [], today);
  const closedRuns = day.open.length === 0 ? day.closed : [];

  const unconfirmed = runsheets.filter((r) => r.needsConfirmation && r.status !== 'VALIDE');
  /**
   * Parcels the driver can't act on yet: all of a run not accepted, but only
   * the added ones on a run changed after the start.
   */
  const lockedIds = lockedStopIds(runsheets);
  /** `active` already arrives workable-first (see `getActiveParcels`), so this split is stable, not a re-sort. */
  const workable = (active ?? []).filter((j) => !lockedIds.has(j.id));
  /** Parcels the agency added since the driver accepted the run. */
  const newIds = new Set(unconfirmed.flatMap((r) => r.newStopIds ?? []));
  // The preview of a run to confirm: the new parcels first, they are the news.
  const lockedAll = (active ?? []).filter((j) => lockedIds.has(j.id));
  const lockedParcels = [...lockedAll.filter((j) => newIds.has(j.id)), ...lockedAll.filter((j) => !newIds.has(j.id))];
  const activeIds = active ? new Set(active.map((j) => j.id)) : null;
  /** How many of a run's parcels are still to deliver — unknown until the list is in. */
  const openCountOf = (stopIds: string[]) =>
    activeIds ? stopIds.filter((id) => activeIds.has(id)).length : undefined;

  async function handleReorder(orderedIds: string[]) {
    // Deliberately no reload: the list already shows the new order, and the
    // refetch settling behind it will agree — it's the same order we just
    // told the server to keep.
    try {
      await setStopOrder(orderedIds);
    } catch (error) {
      showToast(t(errorKeyOf(error)));
      return;
    }
    await invalidateDeliveryData();
    showToast(t('runsheets.reorderedToast'));
  }

  async function handleToggleNearestFirst(next: boolean) {
    try {
      await setNearestFirst(next);
    } catch (error) {
      showToast(t(errorKeyOf(error)));
      return;
    }
    await invalidateDeliveryData();
  }

  async function handleCall(job: Job) {
    // Logged first so the attempt is recorded even if the dialer never opens
    // (no telephony on web, or the driver backs out of the call sheet) — and
    // the call still goes through with no connection.
    await callCustomer(job);
  }

  async function handleSheetDone() {
    setSheetJob(null);
    await invalidateDeliveryData();
  }

  const filteredHistory = (history ?? []).filter((j) =>
    filter === 'all' ? true : j.status === filter
  );
  // One parcel can be on several runs (one per failed attempt), so a row is
  // keyed by runsheet + parcel, not by tracking number alone.
  const historyKeys = parcelRowKeys(filteredHistory);
  // Numbered over the whole history, not the filtered view, so a record
  // keeps its attempt number whichever filter is on.
  const attemptNumbers = historyAttempts(history ?? []);
  const attemptOf = new Map((history ?? []).map((job, index) => [job, attemptNumbers[index]] as const));
  const anyCorrectable = (history ?? []).some((j) => j.correctable);
  const codTotal = (active ?? []).reduce((sum, j) => sum + j.cashToCollect, 0);
  const currentCount = workable.length + lockedParcels.length;

  // Bring the linked parcel into view in history, which can run well past a
  // screenful. The current list is a driver's own day — short enough that
  // whatever a notification points to is already on screen without a jump,
  // and jumping mid-drag is exactly what a manual reorder shouldn't do.
  useEffect(() => {
    if (!highlightedId || toggle !== 'history') return;
    const index = filteredHistory.findIndex((job) => job.id === highlightedId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
    }, 250);
    return () => clearTimeout(timer);
  }, [highlightedId, toggle, filteredHistory]);

  // A new filter is a new list: start it from the top, not wherever the
  // previous one was scrolled to.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filter]);

  // Current and History are separate lists, each starting at the top.
  const resetToTop = toTop.reset;
  useEffect(() => resetToTop(), [toggle, resetToTop]);
  const pending = toggle === 'current' ? !active || closedTodayQuery.isPending : !history;

  const titleAndToggle = (
    <>
      <Stack.Screen options={{ title: t('runsheets.headerTitle') }} />
      <SegmentedControl
        segments={[
          { value: 'current', label: t('runsheets.toggleCurrent') },
          { value: 'history', label: t('runsheets.toggleHistory') },
        ]}
        value={toggle}
        onChange={setToggle}
      />
    </>
  );

  if (toggle === 'history') {
    const empty = screen.isError ? (
      <LoadError onRetry={screen.retry} retrying={screen.retrying} />
    ) : pending ? (
      <View style={styles.skeletonGroup}>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </View>
    ) : (
      <EmptyState icon="file-tray-outline" title={t('runsheets.empty.history')} />
    );

    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <FlatList
          ref={listRef}
          data={filteredHistory}
          keyExtractor={(_job, index) => historyKeys[index]}
          refreshControl={
            <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.accent} />
          }
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          onScroll={toTop.onScroll}
          scrollEventThrottle={32}
          // A highlighted parcel far down the list: jump near it, then settle on it.
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 }), 120);
          }}
          ListHeaderComponent={
            <View style={styles.historyHeader}>
              {titleAndToggle}
              {/* Same Apple switcher as Current / History. */}
              <SegmentedControl
                segments={[
                  { value: 'all', label: t('runsheets.filters.all') },
                  { value: 'DELIVERED', label: t('runsheets.filters.delivered') },
                  { value: 'FAILED', label: t('runsheets.filters.failed') },
                ]}
                value={filter}
                onChange={setFilter}
              />
              {/* Why some cards have Update and others a lock. */}
              {(history?.length ?? 0) > 0 && (
                <View style={[styles.historyNote, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="information-circle-outline" size={16} color={colors.accent} />
                  <Text style={[styles.historyNoteText, { color: colors.text }]}>
                    {anyCorrectable
                      ? t('runsheets.history.correctableNote')
                      : t('runsheets.history.allClosedNote')}
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={empty}
          renderItem={({ item: job }) => (
            <View style={styles.row}>
              <ParcelCard
                job={job}
                colors={colors}
                scheme={scheme}
                highlighted={job.id === highlightedId}
                readOnly
                recordLine={historyRecordLine(job, t('attempts.plain', { number: attemptOf.get(job) ?? 1 }))}
                // Open run: Update, to put a mistake right. Closed run: a lock.
                onUpdate={job.correctable ? () => setSheetJob(job) : undefined}
                closedLabel={job.correctable ? undefined : t('runsheets.history.closedTag')}
                updateLabel={t('runsheets.update')}
                callLabel={t('runsheets.call')}
                lockedLabel={t('runsheets.confirm.lockedTag')}
                t={t}
              />
            </View>
          )}
        />

        <ScrollToTopButton
          visible={toTop.visible}
          bottom={toTopBottom}
          onPress={() => listRef.current?.scrollToOffset({ offset: toTop.topOffset, animated: true })}
        />
        <StatusUpdateSheet job={sheetJob} onClose={() => setSheetJob(null)} onDone={handleSheetDone} />
      </View>
    );
  }

  const empty = screen.isError ? (
    <LoadError onRetry={screen.retry} retrying={screen.retrying} />
  ) : pending ? (
    <View style={styles.skeletonGroup}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : closedRuns.length > 0 ? null : (
    // No run at all is not the same as a run with everything done.
    <EmptyState
      icon={day.open.length > 0 ? 'checkmark-done-outline' : 'file-tray-outline'}
      title={day.open.length > 0 ? t('runsheets.empty.current') : t('runsheets.empty.none')}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={currentRef}
        refreshControl={
          <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} tintColor={colors.accent} />
        }
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={!dragging}
        onScroll={toTop.onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          {titleAndToggle}

          {closedRuns.map((runsheet) => (
            <RunsheetDayCard key={runsheet.id} runsheet={runsheet} stage="closed" today={today} />
          ))}

          {/* The open runs — normally one. Each says where it stands and
              carries its own button: confirm, confirm the change, start. */}
          {day.open.map((runsheet) => (
            <RunsheetDayCard
              key={runsheet.id}
              runsheet={runsheet}
              stage={runStage(runsheet, openCountOf(runsheet.stopIds))}
              today={today}
            />
          ))}

          {currentCount > 0 && (
            <View style={styles.summaryRow}>
              <View
                style={[styles.summaryCell, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                <View style={styles.summaryHead}>
                  <View style={[styles.summaryIcon, { backgroundColor: colors.accentSoft }]}>
                    <Icon name="cube-outline" size={15} color={colors.accent} />
                  </View>
                  <Text
                    style={[monoLabelStyle(11, 0.06), styles.summaryLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}>
                    {t('runsheets.summary.toDeliver')}
                  </Text>
                </View>
                <Text style={[monoStyle(28, 'medium'), { color: colors.text }]} numberOfLines={1}>
                  {currentCount}
                </Text>
              </View>
              {/* A fixed size, no shrink-to-fit: letting the amount scale
                  itself made it jump between sizes as the row re-laid out. */}
              <View
                style={[styles.summaryCell, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                <View style={styles.summaryHead}>
                  <View style={[styles.summaryIcon, { backgroundColor: colors.successSoft }]}>
                    <Icon name="cash-outline" size={15} color={colors.success} />
                  </View>
                  <Text
                    style={[monoLabelStyle(11, 0.06), styles.summaryLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}>
                    {t('runsheets.summary.toCollect')}
                  </Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={[monoStyle(24, 'medium'), { color: colors.success }]} numberOfLines={1}>
                    {formatDecimal(codTotal, CURRENCY_DECIMALS)}
                  </Text>
                  <Text style={[monoStyle(11), { color: colors.textSecondary }]}>TND</Text>
                </View>
              </View>
            </View>
          )}

          {workable.length > 1 && (
            <View style={[styles.nearestFirstRow, { backgroundColor: colors.bgElevated }]}>
              <View style={styles.nearestFirstText}>
                <Icon name="navigate-outline" size={15} color={colors.textSecondary} />
                <Text style={[Typography.footnote, { color: colors.text }]}>
                  {t('runsheets.nearestFirst')}
                </Text>
              </View>
              <NativeSwitch
                value={nearestFirst}
                onValueChange={handleToggleNearestFirst}
              />
            </View>
          )}
          {workable.length > 1 && nearestFirst && positionProblem && (
            <View style={styles.nearestFirstNote}>
              <Icon name="information-circle-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.nearestFirstNoteText, { color: colors.textSecondary }]}>
                {t(`runsheets.nearestFirstFallback.${positionProblem}`)}
              </Text>
            </View>
          )}
        </View>

        {screen.isError && !active ? (
          <LoadError onRetry={screen.retry} retrying={screen.retrying} />
        ) : pending ? (
          <View style={styles.skeletonGroup}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : currentCount === 0 ? (
          empty
        ) : (
          <>
            <DraggableList
              data={workable}
              idOf={(job) => job.id}
              onReorder={handleReorder}
              onDragStateChange={(isDragging) => {
                draggingRef.current = isDragging;
                setDragging(isDragging);
              }}
              renderItem={(job, index, drag) => (
                <ParcelCard
                  job={job}
                  colors={colors}
                  scheme={scheme}
                  highlighted={job.id === highlightedId}
                  stopNumber={index + 1}
                  drag={drag}
                  opensStop
                  onCall={() => handleCall(job)}
                  onUpdate={() => setSheetJob(job)}
                  updateLabel={t('runsheets.update')}
                  callLabel={t('runsheets.call')}
                  lockedLabel={t('runsheets.confirm.lockedTag')}
                  t={t}
                />
              )}
            />
            {/* A run not confirmed yet: its parcels are a preview, read-only. */}
            {lockedParcels.length > 0 && (
              <View style={styles.previewNote}>
                <Icon name="eye-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.previewNoteText, { color: colors.textSecondary }]}>
                  {t('runsheets.day.preview')}
                </Text>
              </View>
            )}
            {lockedParcels.map((job, i) => (
              <View key={job.id} style={styles.row}>
                <ParcelCard
                  job={job}
                  colors={colors}
                  scheme={scheme}
                  highlighted={job.id === highlightedId}
                  stopNumber={workable.length + i + 1}
                  locked
                  isNew={newIds.has(job.id)}
                  updateLabel={t('runsheets.update')}
                  callLabel={t('runsheets.call')}
                  lockedLabel={t('runsheets.confirm.lockedTag')}
                  t={t}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <ScrollToTopButton
        visible={toTop.visible && !dragging}
        bottom={toTopBottom}
        onPress={() => currentRef.current?.scrollTo({ y: toTop.topOffset, animated: true })}
      />
      <StatusUpdateSheet job={sheetJob} onClose={() => setSheetJob(null)} onDone={handleSheetDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The header's last item sits one card-gap above the first card, the same
  // space as between two cards.
  headerBlock: {
    gap: Spacing.mlg,
  },
  historyHeader: {
    gap: Spacing.mlg,
    paddingBottom: Spacing.md,
  },
  row: {
    paddingBottom: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: 110,
    gap: Spacing.md,
  },
  // No `gap` here: each row carries its own spacing.
  listContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  skeletonGroup: { gap: Spacing.md },
  historyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  historyNoteText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
  summaryCell: {
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.xl,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  nearestFirstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.mlg,
    borderRadius: Radii.lg,
  },
  previewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  previewNoteText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  nearestFirstNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  nearestFirstNoteText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  nearestFirstText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  recordLine: {
    ...monoStyle(12, 'medium'),
    marginTop: Spacing.xs,
  },
  failureText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  parcelStatusText: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
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
});
