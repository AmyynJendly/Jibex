import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { LoadError } from '../components/LoadError';
import { GlassIconButton } from '../components/GlassIconButton';
import { MetaChip } from '../components/MetaChip';
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
import { formatCurrency } from '../lib/currency';
import { telUrl } from '../lib/phone';
import { invalidatePickups, usePickups, useScreenState } from '../lib/query';
import { useFocusHighlight, useTabSegment } from '../lib/useFocusHighlight';
import { useOnlineGuard } from '../lib/useOnlineGuard';
import { completePickups, setPickupOrder } from '../services/mock-api';
import type { Pickup, PickupStatus } from '../types';

/**
 * Pickup addresses only have text, not coordinates, so this navigates by
 * address query rather than lat/lng (same Google Maps app/web fallback
 * pattern as the job-detail screen's `openInMaps`).
 */
async function openInMaps(address: string) {
  const query = encodeURIComponent(address);
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;

  const appUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${query}&directionsmode=driving`,
    android: `google.navigation:q=${query}`,
  });

  if (appUrl) {
    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    if (canOpen) {
      Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
      return;
    }
  }

  Linking.openURL(webUrl);
}

interface PickupCardProps {
  pickup: Pickup;
  colors: ColorPalette;
  scheme: 'light' | 'dark';
  expanded: boolean;
  /** Completed pickups are a record, not a worklist — no actions on them. */
  readOnly?: boolean;
  selected?: boolean;
  /** Arrived here from a notification about this pickup. */
  highlighted?: boolean;
  /** Present only for a scheduled stop — spreads onto `DragHandle`. */
  drag?: DragBinding;
  onToggle: () => void;
  onSelect?: () => void;
  t: TFunction;
}

/**
 * One merchant stop. Call and Navigate act on the stop itself — a driver
 * ringing ahead is ringing the shop, not one parcel inside it — so they sit
 * on the card, above the parcel list rather than inside it.
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
  selected = false,
  highlighted = false,
  drag,
  onToggle,
  onSelect,
  t,
}: PickupCardProps) {
  const codTotal = pickup.parcels.reduce((sum, p) => sum + p.codAmount, 0);
  const accent = readOnly ? colors.success : colors.purple;

  return (
    <Card
      accent={accent}
      padding="tight"
      borderColor={
        selected ? colors.success : highlighted ? colors.accent : undefined
      }>

      <View style={styles.headRow}>
        {drag && <DragHandle drag={drag} />}
        {/* Ticking a stop is what marks it collected — deliberately its own
            control, so expanding to check the parcels never commits anything. */}
        {onSelect && (
          <AnimatedPressable
            scaleTo={0.88}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={t('pickups.selectLabel')}
            style={[
              styles.checkbox,
              selected
                ? { backgroundColor: colors.success, borderColor: colors.success }
                : { borderColor: colors.separator },
            ]}
            onPress={onSelect}>
            {selected && <Icon name="checkmark" size={17} color="#fff" />}
          </AnimatedPressable>
        )}
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
              onPress={() => openInMaps(pickup.address)}>
              <Icon name="navigate" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextOn]}>
                {t('pickups.navigate')}
              </Text>
            </AnimatedPressable>
          </>
        )}
      </View>

      {expanded && (
        <View style={styles.parcels}>
          <Text style={[styles.parcelsTitle, { color: colors.textTertiary }]} numberOfLines={1}>
            {t('pickups.parcelsTitle')} · {pickup.contactName}
          </Text>
          {pickup.parcels.map((parcel) => (
            <View
              key={parcel.trackingNumber}
              style={[styles.parcelRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.parcelTracking, { color: colors.text }]} numberOfLines={1}>
                {parcel.trackingNumber}
              </Text>
              <Text style={[styles.parcelCod, { color: colors.accent }]} numberOfLines={1}>
                {formatCurrency(parcel.codAmount)}
              </Text>
            </View>
          ))}
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
  const pickupsQuery = usePickups();
  const screen = useScreenState([pickupsQuery]);
  const pickups = pickupsQuery.data ?? null;
  const [segment, setSegment] = useTabSegment<PickupStatus>(['SCHEDULED', 'COMPLETED'], 'SCHEDULED');
  const highlightedId = useFocusHighlight();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const scheduled = pickups?.filter((p) => p.status === 'SCHEDULED') ?? [];
  const completed = pickups?.filter((p) => p.status === 'COMPLETED') ?? [];
  const displayed = segment === 'SCHEDULED' ? scheduled : completed;

  // Ticking a stop is how the driver picks which ones they've actually
  // collected — "Done" then closes out exactly those, not the whole list.
  const selected = scheduled.filter((p) => selectedIds.has(p.id));

  async function handleDoneSelected() {
    if (selected.length === 0 || completing) return;
    if (!requireOnline()) return;

    const confirmed = await confirm({
      title: t('pickups.doneConfirmTitle'),
      message: t('pickups.doneConfirmMessage', {
        count: selected.length,
        names: selected.map((p) => p.businessName).join(', '),
      }),
      confirmLabel: t('pickups.doneConfirmAction'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    setCompleting(true);
    const ids = selected.map((p) => p.id);
    await completePickups(ids);
    await invalidatePickups();
    const forget = (prev: Set<string>) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    };
    setSelectedIds(forget);
    setExpandedIds(forget);
    setCompleting(false);
    showToast(t('pickups.doneToast', { count: ids.length }));
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.backRow}>
        <GlassIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
      </View>
      <View style={styles.header}>
        <View>
          <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
            {t('pickups.eyebrow')}
          </Text>
          <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
            {t('pickups.headerTitle')}
          </Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={[monoStyle(30, 'medium'), { color: colors.text }]}>{totalPackages}</Text>
          <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
            {t('pickups.parcelCountLabel')}
          </Text>
        </View>
      </View>

      {segment === 'COMPLETED' ? (
        <FlashList
          data={displayed}
          keyExtractor={(pickup) => pickup.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <SegmentedControl
                segments={[
                  { value: 'SCHEDULED', label: t('pickups.segments.scheduled') },
                  { value: 'COMPLETED', label: t('pickups.segments.completed') },
                ]}
                value={segment}
                onChange={setSegment}
              />
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
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.content}>
          <View style={styles.headerBlock}>
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
                  selected={selectedIds.has(pickup.id)}
                  highlighted={pickup.id === highlightedId}
                  drag={drag}
                  onToggle={() => toggleIn(setExpandedIds, pickup.id)}
                  onSelect={() => toggleIn(setSelectedIds, pickup.id)}
                  t={t}
                />
              )}
            />
          )}
        </ScrollView>
      )}

      {segment === 'SCHEDULED' && scheduled.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgElevated, borderTopColor: colors.separator },
          ]}>
          <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
            {selected.length === 0
              ? t('pickups.doneHint')
              : t('pickups.doneSelectedNote', { count: selected.length })}
          </Text>
          <AnimatedPressable
            scaleTo={0.95}
            disabled={selected.length === 0 || completing}
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.success,
                opacity: selected.length === 0 || completing ? 0.4 : 1,
              },
            ]}
            onPress={handleDoneSelected}>
            <Icon name="checkmark-done" size={17} color="#fff" />
            <Text style={styles.doneButtonText}>
              {selected.length > 0
                ? t('pickups.doneWithCount', { count: selected.length })
                : t('pickups.done')}
            </Text>
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
    gap: Spacing.mlg,
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  headerBlock: {
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
  checkbox: {
    width: 28,
    height: 28,
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
    flexShrink: 1,
  },
  parcelCod: {
    ...monoStyle(13, 'medium'),
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
  footerNote: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 46,
    paddingHorizontal: Spacing.xl,
    borderRadius: 23,
  },
  doneButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
    color: '#fff',
  },
});
