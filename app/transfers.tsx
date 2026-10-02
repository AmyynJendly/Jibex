import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AgencyFlow } from '../components/AgencyFlow';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { DragHandle, DraggableList, type DragBinding } from '../components/DraggableList';
import { HandoffQrSheet } from '../components/HandoffQrSheet';
import { EmptyState } from '../components/EmptyState';
import { HistoryDateFilter } from '../components/HistoryDateFilter';
import { TrackingId } from '../components/TrackingId';
import { TransferPickupCheck } from '../components/TransferPickupCheck';
import { LoadError } from '../components/LoadError';
import { MetaChip } from '../components/MetaChip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScrollToTopButton, useScrollToTop } from '../components/ScrollToTopButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import {
  Radii,
  Spacing,
  monoLabelStyle,
  monoStyle,
  useColors,
} from '../constants';
import { checklistKey, clearChecklist } from '../lib/checklist';
import { localeTag } from '../lib/date';
import { matchesDateFilter, type DateFilter } from '../lib/dateFilter';
import { invalidateTransfers, useScreenState, useTransfers } from '../lib/query';
import { safely, writeErrorText } from '../lib/writeResult';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { useFocusHighlight, useTabSegment } from '../lib/useFocusHighlight';
import { confirmTransferPickup, setTransferOrder } from '../services/api';
import type { Transfer } from '../types';

type Toggle = 'current' | 'history';

export default function TransfersScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  // A transfer appears once the agency validates it: reload when this screen
  // comes into view, and every minute while it stays there.
  useAutoRefresh(invalidateTransfers);
  const transfersQuery = useTransfers();
  const screen = useScreenState([transfersQuery]);
  const transfers = transfersQuery.data ?? null;
  const [toggle, setToggle] = useTabSegment<Toggle>(['current', 'history'], 'current');
  const highlightedId = useFocusHighlight();
  const [qrTransferId, setQrTransferId] = useState<string | null>(null);
  // The transfer whose pickup confirmation is on its way to the server.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // The large title floats over this list, so its real top is above offset 0.
  const toTop = useScrollToTop({ floatingHeader: true });
  // Current and History are separate lists, each starting at the top.
  const resetToTop = toTop.reset;
  useEffect(() => resetToTop(), [toggle, resetToTop]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag(i18n.language), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async function handleReorder(orderedIds: string[]) {
    await setTransferOrder(orderedIds);
    showToast(t('transfers.reorderedToast'));
  }

  /**
   * "Confirmer la prise en charge": the batch leaves "ready" and goes in
   * transit — once the server agrees. Same call as before
   * (confirm-pickup); what changed is that the button is only reachable
   * with every parcel scanned, or through "Confirmer sans scan" below.
   */
  async function confirmPickup(transfer: Transfer) {
    if (confirmingId) return;
    setConfirmingId(transfer.id);
    const result = await safely(() => confirmTransferPickup(transfer));
    setConfirmingId(null);
    if (!result.success) {
      // Nothing changes on screen, the scans stay, and the reason is shown.
      showToast(writeErrorText(t, result));
      return;
    }
    clearChecklist(checklistKey.transfer(transfer.id));
    await invalidateTransfers();
    showToast(t('transfers.confirmPickupToast'));
  }

  /** Every parcel is scanned. One last "are you sure": the transfer can't be changed afterwards. */
  async function handleConfirmPickup(transfer: Transfer) {
    const accepted = await confirm({
      title: t('transfers.confirmPickupTitle'),
      message: t('transfers.confirmPickupMessage', { count: transfer.parcelCount, to: transfer.destinationAgency }),
      confirmLabel: t('transfers.check.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (accepted) await confirmPickup(transfer);
  }

  /** Not everything was scanned (a damaged label, or no parcel list): the driver has to say so on purpose. */
  async function handleConfirmWithoutScan(transfer: Transfer, progress: { done: number; total: number }) {
    const accepted = await confirm({
      title: t('transfers.check.withoutScanTitle'),
      message:
        progress.total > 0
          ? t('transfers.check.withoutScanMessage', { done: progress.done, total: progress.total })
          : t('transfers.check.noListMessage', { count: transfer.parcelCount }),
      confirmLabel: t('transfers.check.withoutScan'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (accepted) await confirmPickup(transfer);
  }

  const current = transfers?.filter((tr) => tr.status === 'IN_PROGRESS') ?? [];
  // History, by when the batch was handed over (or scheduled, on mock data).
  const history =
    transfers?.filter(
      (tr) =>
        tr.status === 'COMPLETED' &&
        matchesDateFilter(
          tr.server?.completedAt ?? tr.server?.receivedAt ?? tr.server?.closedAt ?? tr.scheduledAt,
          dateFilter
        )
    ) ?? [];
  // History is read-only: no QR, no actions of any kind.
  const isHistory = toggle === 'history';
  const displayed = isHistory ? history : current;
  const parcelsMoving = current.reduce((sum, tr) => sum + tr.parcelCount, 0);

  function renderCard(transfer: Transfer, drag?: DragBinding) {
    const completed = transfer.status === 'COMPLETED';
    const accent = completed ? colors.success : colors.accent;

    return (
      <Card
        key={transfer.id}
        accent={accent}
        gap={Spacing.md}
        borderColor={transfer.id === highlightedId ? colors.accent : undefined}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            {drag && <DragHandle drag={drag} />}
            <TrackingId value={transfer.id} size="inline" />
          </View>
          <Text
            style={[
              styles.statusChip,
              {
                color: accent,
                backgroundColor: completed ? colors.successSoft : colors.accentSoft,
              },
            ]}
            numberOfLines={1}>
            {completed
              ? t('transfers.status.completed')
              : transfer.awaitingPickupConfirmation
                ? t('transfers.status.readyForPickup')
                : t('transfers.status.awaitingHandoff')}
          </Text>
        </View>

        <AgencyFlow
          fromLabel={t('transfers.from')}
          from={transfer.originAgency}
          toLabel={t('transfers.to')}
          to={transfer.destinationAgency}
        />

        <View style={styles.metaRow}>
          <MetaChip
            icon="cube-outline"
            tone="accent"
            label={t('common.package', { count: transfer.parcelCount })}
          />
          <MetaChip icon="business-outline" label={transfer.location} />
          <MetaChip icon="time-outline" label={formatTime(transfer.scheduledAt)} />
        </View>

        {!isHistory && !transfer.awaitingPickupConfirmation && (
          <View style={[styles.actions, { borderTopColor: colors.separator }]}>
            <PrimaryButton
              label={t('transfers.showQr')}
              height={46}
              onPress={() => setQrTransferId(transfer.id)}
            />
          </View>
        )}

        {/* Waiting on this driver: scan every parcel, then confirm. */}
        {!isHistory && transfer.awaitingPickupConfirmation && (
          <TransferPickupCheck
            transfer={transfer}
            confirming={confirmingId === transfer.id}
            onConfirm={() => handleConfirmPickup(transfer)}
            onConfirmWithoutScan={(progress) => handleConfirmWithoutScan(transfer, progress)}
          />
        )}
      </Card>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: t('transfers.headerTitle') }} />

      {/* The list and its back-to-top arrow share one area, so the arrow
          always sits just above the footer (or the bottom edge). */}
      <View style={styles.listArea}>
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          scrollEnabled={!dragging}
          onScroll={toTop.onScroll}
          scrollEventThrottle={32}
          scrollToOverflowEnabled={toTop.scrollToOverflowEnabled}
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
                {t('transfers.eyebrow')}
              </Text>
            </View>
            <View style={styles.headerCount}>
              <Text style={[monoStyle(30, 'medium'), { color: colors.text }]}>{parcelsMoving}</Text>
              <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
                {t('transfers.movingLabel')}
              </Text>
            </View>
          </View>

          <SegmentedControl
            segments={[
              { value: 'current', label: t('transfers.toggleCurrent') },
              { value: 'history', label: t('transfers.toggleHistory') },
            ]}
            value={toggle}
            onChange={setToggle}
          />
          {isHistory && <HistoryDateFilter value={dateFilter} onChange={setDateFilter} />}

          {screen.isError && !transfers ? (
            <LoadError onRetry={screen.retry} retrying={screen.retrying} />
          ) : !transfers ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title={isHistory ? t('transfers.emptyHistory') : t('transfers.empty')}
            />
          ) : isHistory ? (
            history.map((transfer) => renderCard(transfer))
          ) : (
            <DraggableList
              data={current}
              idOf={(transfer) => transfer.id}
              onReorder={handleReorder}
              onDragStateChange={setDragging}
              renderItem={(transfer, _index, drag) => renderCard(transfer, drag)}
            />
          )}
        </ScrollView>
        <ScrollToTopButton
          visible={toTop.visible && !dragging}
          bottom={Spacing.lg}
          onPress={() => scrollRef.current?.scrollTo({ y: toTop.topOffset, animated: true })}
        />
      </View>

      <HandoffQrSheet
        transfer={current.find((tr) => tr.id === qrTransferId) ?? null}
        onClose={() => setQrTransferId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listArea: {
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
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
    gap: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusChip: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
