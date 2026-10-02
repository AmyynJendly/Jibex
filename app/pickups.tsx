import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Icon } from '../components/Icon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { PackageCube } from '../components/PackageCube';
import { useConfirm } from '../components/ConfirmDialog';
import { DragHandle, DraggableList, type DragBinding } from '../components/DraggableList';
import { EmptyState } from '../components/EmptyState';
import { HistoryDateFilter } from '../components/HistoryDateFilter';
import { LoadError } from '../components/LoadError';
import { MetaChip } from '../components/MetaChip';
import { ScrollToTopButton, useScrollToTop } from '../components/ScrollToTopButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkeletonBlock, SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  monoLabelStyle,
  monoStyle,
  useColors,
  type ColorPalette,
} from '../constants';
import { checkAll, checkProgress, checklistKey, clearChecklist, setChecked } from '../lib/checklist';
import { formatCurrency } from '../lib/currency';
import { matchesDateFilter, type DateFilter } from '../lib/dateFilter';
import { telUrl } from '../lib/phone';
import { invalidatePickups, usePickups, useScreenState } from '../lib/query';
import { normalizeCode } from '../lib/scanSession';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { useChecklist } from '../lib/useChecklist';
import { useFocusHighlight, useTabSegment } from '../lib/useFocusHighlight';
import { useOnlineGuard } from '../lib/useOnlineGuard';
import { openDirections } from '../lib/stopActions';
import { safely, writeErrorText } from '../lib/writeResult';
import { completePickups, setPickupOrder } from '../services/api';
import type { Pickup, PickupStatus } from '../types';

interface PickupCardProps {
  pickup: Pickup;
  colors: ColorPalette;
  scheme: 'light' | 'dark';
  expanded: boolean;
  /** Completed pickups are a record, not a worklist — no actions on them. */
  readOnly?: boolean;
  /** Arrived here from a notification about this pickup. */
  highlighted?: boolean;
  /** Present only for a scheduled stop — spreads onto `DragHandle`. */
  drag?: DragBinding;
  /** "Terminer le pickup" is being sent for this card. */
  finishing?: boolean;
  onToggle: () => void;
  /** The driver has checked the parcels and closes the pickup. */
  onFinish?: () => void;
  t: TFunction;
}

/**
 * One merchant stop. Call and Navigate act on the stop itself — a driver
 * ringing ahead is ringing the shop, not one parcel inside it — so they sit
 * on the card, above the parcel list rather than inside it.
 *
 * A scheduled stop carries its own check: every parcel is scanned or ticked
 * ("3/4 colis") before "Terminer le pickup" is enabled. The server takes the
 * pickup as done on one call, with no count, so this check is the only thing
 * that says the driver really holds each parcel (see lib/checklist).
 *
 * Everything in the header row is one press target, chevron included: a
 * driver aiming for the arrow shouldn't have to hit a 20pt glyph.
 */
function PickupCard({
  pickup,
  colors,
  scheme,
  expanded,
  readOnly = false,
  highlighted = false,
  drag,
  finishing = false,
  onToggle,
  onFinish,
  t,
}: PickupCardProps) {
  const codTotal = pickup.parcels.reduce((sum, p) => sum + p.codAmount, 0);
  const accent = readOnly ? colors.success : colors.purple;

  const checkKey = checklistKey.pickup(pickup.id);
  const checked = useChecklist(checkKey);
  const codes = pickup.parcels.map((parcel) => parcel.trackingNumber);
  const progress = checkProgress(codes, checked);
  // No parcel list from the server: nothing to tick, so the button asks for
  // a confirmation instead (see the screen's `handleFinish`).
  const noList = codes.length === 0;
  const canFinish = progress.complete || noList;

  return (
    <Card
      accent={accent}
      padding="tight"
      borderColor={
        !readOnly && progress.complete ? colors.success : highlighted ? colors.accent : undefined
      }>

      <View style={styles.headRow}>
        {drag && <DragHandle drag={drag} />}
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="button"
          accessibilityLabel={pickup.businessName}
          accessibilityHint={t(expanded ? 'pickups.a11yCollapse' : 'pickups.a11yExpand')}
          style={styles.headPress}
          onPress={onToggle}>
          <View style={styles.headText}>
            <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
              {pickup.businessName}
            </Text>
            <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
              {pickup.address}
            </Text>
          </View>

          <View style={[styles.chevronWell, { backgroundColor: colors.bg }]}>
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={colors.textSecondary}
            />
          </View>
        </AnimatedPressable>
      </View>

      <View style={styles.metaRow}>
        <MetaChip icon="time-outline" label={pickup.timeWindow} />
        <MetaChip
          icon="cube-outline"
          label={t('common.package', { count: pickup.packageCount })}
        />
        <MetaChip icon="cash-outline" label={formatCurrency(codTotal)} tone="accent" />
      </View>

      <View style={[styles.actionRow, { borderTopColor: colors.separator }]}>
        {readOnly ? (
          <View style={styles.collectedRow}>
            <Icon name="checkmark-circle" size={17} color={colors.success} />
            <Text style={[styles.collectedText, { color: colors.success }]}>
              {t('pickups.collected')}
            </Text>
          </View>
        ) : (
          <>
            <AnimatedPressable
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={`${t('pickups.call')} ${pickup.businessName}`}
              style={[styles.actionButton, { backgroundColor: colors.accentSoft }]}
              onPress={() => Linking.openURL(telUrl(pickup.contactPhone)).catch(() => {})}>
              <Icon name="call-outline" size={17} color={colors.accent} />
              <Text style={[styles.actionButtonText, { color: colors.accent }]}>
                {t('pickups.call')}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={`${t('pickups.navigate')} ${pickup.address}`}
              style={[styles.actionButton, styles.actionButtonWide, { backgroundColor: colors.accent }]}
              onPress={() => openDirections({ address: pickup.address })}>
              <Icon name="navigate" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextOn]}>
                {t('pickups.navigate')}
              </Text>
            </AnimatedPressable>
          </>
        )}
      </View>

      {/* The check: how many parcels are verified, and the two fast ways to
          verify them. Ticking one by one is in the parcel list below. */}
      {!readOnly && (
        <View style={[styles.checkBlock, { borderTopColor: colors.separator }]}>
          <View style={styles.checkHead}>
            <View style={styles.checkCount}>
              <Icon
                name={progress.complete ? 'checkmark-circle' : 'cube-outline'}
                size={17}
                color={progress.complete ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  monoStyle(15, 'medium'),
                  { color: progress.complete ? colors.success : colors.text },
                ]}>
                {t('pickups.check.progress', { done: progress.done, total: progress.total })}
              </Text>
            </View>
            {!noList && (
              <View style={styles.checkActions}>
                <AnimatedPressable
                  scaleTo={0.95}
                  accessibilityRole="button"
                  style={[styles.checkAction, { backgroundColor: colors.accentSoft }]}
                  onPress={() =>
                    router.push({
                      pathname: '/scanner',
                      params: { checkKey, expected: JSON.stringify(codes), checkKind: 'pickup' },
                    })
                  }>
                  <Icon name="scan-outline" size={15} color={colors.accent} />
                  <Text style={[styles.checkActionText, { color: colors.accent }]}>
                    {t('pickups.check.scan')}
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  scaleTo={0.95}
                  accessibilityRole="button"
                  style={[styles.checkAction, { backgroundColor: colors.bg }]}
                  onPress={() => (progress.complete ? clearChecklist(checkKey) : checkAll(checkKey, codes))}>
                  <Text style={[styles.checkActionText, { color: colors.textSecondary }]}>
                    {t(progress.complete ? 'pickups.check.untickAll' : 'pickups.check.tickAll')}
                  </Text>
                </AnimatedPressable>
              </View>
            )}
          </View>

          {!canFinish && (
            <Text style={[styles.checkHint, { color: colors.textSecondary }]}>
              {t('pickups.check.finishHint')}
            </Text>
          )}
          {noList && (
            <Text style={[styles.checkHint, { color: colors.textSecondary }]}>
              {t('pickups.check.noList')}
            </Text>
          )}

          <AnimatedPressable
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canFinish || finishing }}
            disabled={!canFinish || finishing}
            style={[
              styles.finishButton,
              { backgroundColor: colors.success, opacity: canFinish && !finishing ? 1 : 0.4 },
            ]}
            onPress={onFinish}>
            <Icon name="checkmark-done" size={17} color="#fff" />
            <Text style={styles.finishButtonText}>{t('pickups.check.finish')}</Text>
          </AnimatedPressable>
        </View>
      )}

      {expanded && (
        <View style={styles.parcels}>
          <Text style={[styles.parcelsTitle, { color: colors.textTertiary }]} numberOfLines={1}>
            {t('pickups.parcelsTitle')} · {pickup.contactName}
          </Text>
          {pickup.parcels.map((parcel) => {
            const isChecked = checked.has(normalizeCode(parcel.trackingNumber));
            const row = (
              <>
                {!readOnly && (
                  <View
                    style={[
                      styles.parcelTick,
                      isChecked
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { borderColor: colors.separator },
                    ]}>
                    {isChecked && <Icon name="checkmark" size={14} color="#fff" />}
                  </View>
                )}
                <Text style={[styles.parcelTracking, { color: colors.text }]} numberOfLines={1}>
                  {parcel.trackingNumber}
                </Text>
                <Text style={[styles.parcelCod, { color: colors.accent }]} numberOfLines={1}>
                  {formatCurrency(parcel.codAmount)}
                </Text>
              </>
            );
            return readOnly ? (
              <View
                key={parcel.trackingNumber}
                style={[styles.parcelRow, { borderTopColor: colors.separator }]}>
                {row}
              </View>
            ) : (
              <AnimatedPressable
                key={parcel.trackingNumber}
                scaleTo={0.99}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={parcel.trackingNumber}
                style={[styles.parcelRow, { borderTopColor: colors.separator }]}
                onPress={() => setChecked(checkKey, parcel.trackingNumber, !isChecked)}>
                {row}
              </AnimatedPressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export default function PickupsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const requireOnline = useOnlineGuard();
  // A pickup is assigned from the agency's side: reload when this screen
  // comes into view, and every minute while it stays there.
  useAutoRefresh(invalidatePickups);
  const pickupsQuery = usePickups();
  const screen = useScreenState([pickupsQuery]);
  const pickups = pickupsQuery.data ?? null;
  const [segment, setSegment] = useTabSegment<PickupStatus>(['SCHEDULED', 'COMPLETED'], 'SCHEDULED');
  const highlightedId = useFocusHighlight();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // The pickup whose "Terminer le pickup" is on its way to the server.
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const scheduledRef = useRef<ScrollView>(null);
  const completedRef = useRef<FlatList<Pickup>>(null);
  const toTop = useScrollToTop();
  // Scheduled and Completed are separate lists, each starting at the top.
  const resetToTop = toTop.reset;
  useEffect(() => resetToTop(), [segment, resetToTop]);

  const scheduled = pickups?.filter((p) => p.status === 'SCHEDULED') ?? [];
  // History, by when it was collected (or was due, when the server has no time for it).
  const completed =
    pickups?.filter(
      (p) =>
        p.status === 'COMPLETED' &&
        matchesDateFilter(p.server?.completedAt ?? p.requestedByDate, dateFilter)
    ) ?? [];
  const displayed = segment === 'SCHEDULED' ? scheduled : completed;

  /**
   * "Terminer le pickup": the driver has scanned or ticked every parcel on
   * the card (the button is disabled until then). A pickup the server sent
   * with no parcel list can't be checked, so it asks for a confirmation
   * instead. Either way the same call as before is sent — nothing new.
   */
  async function handleFinish(pickup: Pickup) {
    if (finishingId) return;
    if (!requireOnline()) return;

    if (pickup.parcels.length === 0) {
      const confirmed = await confirm({
        title: t('pickups.check.noListConfirmTitle'),
        message: t('pickups.check.noListConfirmMessage', { name: pickup.businessName }),
        confirmLabel: t('pickups.check.finish'),
        cancelLabel: t('common.cancel'),
      });
      if (!confirmed) return;
    }

    setFinishingId(pickup.id);
    const result = await safely(() => completePickups([pickup.id]));
    setFinishingId(null);
    const succeeded = 'succeeded' in result ? result.succeeded : [];
    if (succeeded.length === 0) {
      // Nothing on screen changes, the ticks stay, and the reason is shown.
      showToast(writeErrorText(t, result));
      return;
    }

    clearChecklist(checklistKey.pickup(pickup.id));
    await invalidatePickups();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(pickup.id);
      return next;
    });
    showToast(t('pickups.check.doneToast'));
  }

  async function handleReorder(orderedIds: string[]) {
    await setPickupOrder(orderedIds);
    await invalidatePickups();
    showToast(t('pickups.reorderedToast'));
  }

  function toggleIn(setter: typeof setExpandedIds, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const totalPackages = displayed.reduce((sum, p) => sum + p.packageCount, 0);

  // Sits at the top of whichever list is showing, under Apple's large title.
  const summary = (
    <View style={styles.header}>
      <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
        {t('pickups.eyebrow')}
      </Text>
      <View style={styles.headerCount}>
        <Text style={[monoStyle(30, 'medium'), { color: colors.text }]}>{totalPackages}</Text>
        <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
          {t('pickups.parcelCountLabel')}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: t('pickups.headerTitle') }} />

      {/* The list and its back-to-top arrow share one area, so the arrow
          always sits just above the footer (or the bottom edge). */}
      <View style={styles.listArea}>
        {segment === 'COMPLETED' ? (
          // A plain FlatList: every card is sized to its own content (FlashList
          // re-used cells and left gaps between cards).
          <FlatList
            ref={completedRef}
            data={displayed}
            keyExtractor={(pickup) => pickup.id}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.listContent}
            onScroll={toTop.onScroll}
            scrollEventThrottle={32}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                {summary}
                <SegmentedControl
                  segments={[
                    { value: 'SCHEDULED', label: t('pickups.segments.scheduled') },
                    { value: 'COMPLETED', label: t('pickups.segments.completed') },
                  ]}
                  value={segment}
                  onChange={setSegment}
                />
                <HistoryDateFilter value={dateFilter} onChange={setDateFilter} />
              </View>
            }
            ListEmptyComponent={
              screen.isError && !pickups ? (
                <LoadError onRetry={screen.retry} retrying={screen.retrying} />
              ) : !pickups ? (
                <View style={styles.skeletonGroup}>
                  <SkeletonBlock height={140} radius={Radii.card} />
                  <SkeletonRow />
                  <SkeletonRow />
                </View>
              ) : (
                <EmptyState icon="checkmark-done-outline" title={t('pickups.empty.completed')} />
              )
            }
            renderItem={({ item: pickup }) => (
              <View style={styles.row}>
                <PickupCard
                  pickup={pickup}
                  colors={colors}
                  scheme={scheme}
                  readOnly
                  expanded={expandedIds.has(pickup.id)}
                  highlighted={pickup.id === highlightedId}
                  onToggle={() => toggleIn(setExpandedIds, pickup.id)}
                  t={t}
                />
              </View>
            )}
          />
        ) : (
          <ScrollView
            ref={scheduledRef}
            contentInsetAdjustmentBehavior="automatic"
            scrollEnabled={!dragging}
            onScroll={toTop.onScroll}
            scrollEventThrottle={32}
            contentContainerStyle={styles.content}>
            <View style={styles.headerBlock}>
              {summary}
              <SegmentedControl
                segments={[
                  { value: 'SCHEDULED', label: t('pickups.segments.scheduled') },
                  { value: 'COMPLETED', label: t('pickups.segments.completed') },
                ]}
                value={segment}
                onChange={setSegment}
              />
            </View>

            {screen.isError && !pickups ? (
              <LoadError onRetry={screen.retry} retrying={screen.retrying} />
            ) : !pickups ? (
              <View style={styles.skeletonGroup}>
                <SkeletonBlock height={140} radius={Radii.card} />
                <SkeletonRow />
                <SkeletonRow />
              </View>
            ) : scheduled.length === 0 ? (
              <EmptyState
                illustration={<PackageCube size={34} />}
                title={t('pickups.empty.scheduled')}
              />
            ) : (
              <DraggableList
                data={scheduled}
                idOf={(pickup) => pickup.id}
                onReorder={handleReorder}
                onDragStateChange={setDragging}
                renderItem={(pickup, _index, drag) => (
                  <PickupCard
                    pickup={pickup}
                    colors={colors}
                    scheme={scheme}
                    expanded={expandedIds.has(pickup.id)}
                    highlighted={pickup.id === highlightedId}
                    drag={drag}
                    finishing={finishingId === pickup.id}
                    onToggle={() => toggleIn(setExpandedIds, pickup.id)}
                    onFinish={() => handleFinish(pickup)}
                    t={t}
                  />
                )}
              />
            )}
          </ScrollView>
        )}
        <ScrollToTopButton
          visible={toTop.visible && !dragging}
          bottom={Spacing.lg}
          onPress={() =>
            segment === 'COMPLETED'
              ? completedRef.current?.scrollToOffset({ offset: toTop.topOffset, animated: true })
              : scheduledRef.current?.scrollTo({ y: toTop.topOffset, animated: true })
          }
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerCount: {
    alignItems: 'flex-end',
  },
  listArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
    gap: Spacing.mlg,
  },
  // No `gap` here: each row carries its own spacing.
  listContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  // One card-gap between the header's last item and the first card, the
  // same space as between two cards.
  headerBlock: {
    gap: Spacing.md,
  },
  listHeader: {
    gap: Spacing.md,
    paddingBottom: Spacing.mlg,
  },
  row: {
    paddingBottom: Spacing.mlg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  // The whole row is the toggle — icon, text and chevron alike.
  headPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    minHeight: 44,
  },
  checkBlock: {
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.smd,
    paddingTop: Spacing.smd,
  },
  checkHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  checkCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  checkActionText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  checkHint: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 46,
    borderRadius: 23,
  },
  finishButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
    color: '#fff',
  },
  parcelTick: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  businessName: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
  },
  chevronWell: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    flex: 1,
    borderRadius: Radii.md,
  },
  actionButtonWide: {
    flex: 1.4,
  },
  actionButtonText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  actionButtonTextOn: {
    color: '#fff',
  },
  collectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 40,
  },
  collectedText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  parcels: {
    marginTop: Spacing.xs,
  },
  parcelsTitle: {
    ...monoLabelStyle(10, 0.04),
    textTransform: 'uppercase',
    paddingVertical: Spacing.sm,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  parcelTracking: {
    ...monoStyle(13, 'medium'),
    flex: 1,
  },
  parcelCod: {
    ...monoStyle(13, 'medium'),
  },
});
