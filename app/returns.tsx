import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AgencyFlow } from '../components/AgencyFlow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { DragHandle, DraggableList, type DragBinding } from '../components/DraggableList';
import { EmptyState } from '../components/EmptyState';
import { TrackingId } from '../components/TrackingId';
import { LoadError } from '../components/LoadError';
import { GlassIconButton } from '../components/GlassIconButton';
import { MetaChip } from '../components/MetaChip';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  monoLabelStyle,
  monoStyle,
  useColors,
} from '../constants';
import { localeTag } from '../lib/date';
import { enumLabel } from '../lib/enumLabel';
import { invalidateReturns, useReturns, useScreenState } from '../lib/query';
import { useOnlineGuard } from '../lib/useOnlineGuard';
import { useFocusHighlight, useTabParam } from '../lib/useFocusHighlight';
import { confirmReturns, setReturnOrder } from '../services/mock-api';
import type { Return } from '../types';

type Toggle = 'current' | 'history';

export default function ReturnsScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const requireOnline = useOnlineGuard();
  const returnsQuery = useReturns();
  const screen = useScreenState([returnsQuery]);
  const returns = returnsQuery.data ?? null;
  const tabParam = useTabParam(['current', 'history'] as const);
  const [toggle, setToggle] = useState<Toggle>(tabParam ?? 'current');
  const highlightedId = useFocusHighlight();

  useEffect(() => {
    if (tabParam) setToggle(tabParam);
  }, [tabParam]);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag(i18n.language), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const pending = returns?.filter((r) => r.status === 'PENDING_PICKUP') ?? [];
  const processed = returns?.filter((r) => r.status === 'PROCESSED') ?? [];
  const isHistory = toggle === 'history';
  const displayed = isHistory ? processed : pending;
  const pendingParcelTotal = displayed.reduce((sum, r) => sum + r.parcelCount, 0);

  /**
   * Signs for return batches without scanning. The depot counts a hand-back
   * against the manifest at the counter; scanning each batch is the fallback
   * for when the paperwork and the pallet disagree, not the normal path.
   */
  async function handleConfirm(batches: Return[]) {
    if (batches.length === 0 || confirming) return;
    if (!requireOnline()) return;
    const parcels = batches.reduce((sum, r) => sum + r.parcelCount, 0);

    const accepted = await confirm({
      title: t('returns.confirmTitle'),
      message: t('returns.confirmMessage', { count: batches.length, parcels }),
      confirmLabel: t('returns.confirmAction'),
      cancelLabel: t('common.cancel'),
    });
    if (!accepted) return;

    setConfirming(true);
    await confirmReturns(batches.map((r) => r.id));
    await invalidateReturns();
    setConfirming(false);
    showToast(t('returns.confirmToast', { count: batches.length }));
  }

  async function handleReorder(orderedIds: string[]) {
    await setReturnOrder(orderedIds);
    showToast(t('returns.reorderedToast'));
  }

  function renderCard(item: Return, drag?: DragBinding) {
    const accent = isHistory ? colors.success : colors.warning;
    return (
      <Card
        key={item.id}
        accent={accent}
        gap={Spacing.md}
        borderColor={item.id === highlightedId ? colors.accent : undefined}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            {drag && <DragHandle drag={drag} />}
            <TrackingId value={item.id} size="inline" />
          </View>
          <Text
            style={[
              styles.statusChip,
              {
                color: accent,
                backgroundColor: isHistory ? colors.successSoft : colors.warningSoft,
              },
            ]}
            numberOfLines={1}>
            {enumLabel(t, 'returnStatus', item.status)}
          </Text>
        </View>

        <AgencyFlow
          fromLabel={t('returns.from')}
          from={item.fromAgency}
          toLabel={t('returns.to')}
          to={item.toAgency}
        />

        <View style={styles.metaRow}>
          <MetaChip
            icon="arrow-undo-outline"
            tone={isHistory ? 'success' : 'warning'}
            label={t('common.package', { count: item.parcelCount })}
          />
          <MetaChip icon="business-outline" label={item.location} />
          <MetaChip icon="time-outline" label={formatTime(item.scheduledAt)} />
        </View>

        {item.relatedTransferId && (
          <View style={styles.sourceRow}>
            <Ionicons name="git-branch-outline" size={13} color={colors.textTertiary} />
            <Text style={[monoStyle(11), { color: colors.textTertiary }]} numberOfLines={1}>
              {t('returns.relatedTransfer', { id: item.relatedTransferId })}
            </Text>
          </View>
        )}

        {/* History is read-only — no actions there. */}
        {!isHistory && (
          <View style={[styles.actions, { borderTopColor: colors.separator }]}>
            <AnimatedPressable
              scaleTo={0.96}
              style={[styles.confirmButton, { backgroundColor: colors.success }]}
              onPress={() => handleConfirm([item])}>
              <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
              <Text style={styles.confirmButtonText}>{t('returns.confirmOne')}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel={t('returns.scan')}
              style={[styles.scanIconButton, { borderColor: colors.separator }]}
              onPress={() =>
                router.push({
                  pathname: '/scanner',
                  params: { batchIds: JSON.stringify([item.id]) },
                })
              }>
              <Ionicons name="scan-outline" size={18} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>
        )}
      </Card>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.backRow}>
        <GlassIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
      </View>
      <View style={styles.header}>
        <View>
          <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
            {t('returns.eyebrow')}
          </Text>
          <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
            {t('returns.headerTitle')}
          </Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={[monoStyle(30, 'medium'), { color: colors.text }]}>{pendingParcelTotal}</Text>
          <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
            {t('returns.parcelsLabel')}
          </Text>
        </View>
      </View>

      <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'current', label: t('returns.toggleCurrent') },
            { value: 'history', label: t('returns.toggleHistory') },
          ]}
          value={toggle}
          onChange={setToggle}
        />

        {!isHistory && pending.length > 0 && (
          <View style={[styles.inverseNote, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.inverseNoteText, { color: colors.text }]}>
              {t('returns.inverseNote')}
            </Text>
          </View>
        )}

        {screen.isError && !returns ? (
          <LoadError onRetry={screen.retry} retrying={screen.retrying} />
        ) : !returns ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon="arrow-undo-outline"
            title={isHistory ? t('returns.emptyHistory') : t('returns.empty')}
          />
        ) : isHistory ? (
          processed.map((item) => renderCard(item))
        ) : (
          <DraggableList
            data={pending}
            idOf={(item) => item.id}
            onReorder={handleReorder}
            onDragStateChange={setDragging}
            renderItem={(item, _index, drag) => renderCard(item, drag)}
          />
        )}
      </ScrollView>

      {!isHistory && pending.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgElevated, borderTopColor: colors.separator },
          ]}>
          {/* Signing for the lot is the common case, so it leads; scanning
              stays one tap away for when the count has to be proven. */}
          <AnimatedPressable
            scaleTo={0.96}
            disabled={confirming}
            style={[
              styles.confirmAllButton,
              { backgroundColor: colors.success, opacity: confirming ? 0.5 : 1 },
            ]}
            onPress={() => handleConfirm(pending)}>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
            <Text style={styles.confirmAllButtonText}>
              {t('returns.confirmAllWithCount', { count: pending.length })}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('returns.scanAllWithCount', { count: pending.length })}
            style={[styles.scanAllButton, { backgroundColor: colors.warningSoft }]}
            onPress={() =>
              router.push({
                pathname: '/scanner',
                params: { batchIds: JSON.stringify(pending.map((r) => r.id)) },
              })
            }>
            <Ionicons name="scan" size={19} color={colors.warning} />
          </AnimatedPressable>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
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
  inverseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  inverseNoteText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 17,
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
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.full,
  },
  confirmButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
    color: '#fff',
  },
  scanIconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    paddingBottom: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: 24,
  },
  confirmAllButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
    color: '#fff',
  },
  scanAllButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
