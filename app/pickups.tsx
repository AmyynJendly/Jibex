import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { useConfirm } from '../components/ConfirmDialog';
import { DragHandle, DraggableList, type DragBinding } from '../components/DraggableList';
import { EmptyState } from '../components/EmptyState';
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
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  useColors,
  type ColorPalette,
} from '../constants';
import { formatCurrency } from '../lib/currency';
import { telUrl } from '../lib/phone';
import { completePickups, getPickups, setPickupOrder } from '../services/mock-api';
import type { Pickup, PickupStatus } from '../types';

const STAGGER_MS = 40;

/** Card height plus the gap under it — the drag list lays rows out from these. */
const COLLAPSED_HEIGHT = 190;
const PARCEL_ROW_HEIGHT = 40;
const PARCELS_HEADER_HEIGHT = 30;

function pickupHeight(pickup: Pickup, expanded: boolean) {
  if (!expanded) return COLLAPSED_HEIGHT;
  return COLLAPSED_HEIGHT + PARCELS_HEADER_HEIGHT + pickup.parcels.length * PARCEL_ROW_HEIGHT;
}

const pickupId = (pickup: Pickup) => pickup.id;

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
  stopNumber?: number;
  drag?: DragBinding;
  onToggle: () => void;
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
  stopNumber,
  drag,
  onToggle,
  t,
}: PickupCardProps) {
  const codTotal = pickup.parcels.reduce((sum, p) => sum + p.codAmount, 0);
  const accent = readOnly ? colors.success : colors.purple;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgElevated },
        expanded && !readOnly && { borderColor: colors.success, borderWidth: 1.5 },
        getCardShadow(scheme),
      ]}>
      <View style={[styles.cardEdge, { backgroundColor: accent }]} />

      <View style={styles.headRow}>
        {drag && <DragHandle drag={drag} />}
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="button"
          style={styles.headPress}
          onPress={onToggle}>
          <View style={[styles.cardIcon, { backgroundColor: colors.purpleSoft }]}>
            <Ionicons name="storefront-outline" size={20} color={colors.purple} />
            {stopNumber !== undefined && (
              <View style={[styles.stopBadge, { backgroundColor: colors.purple }]}>
                <Text style={styles.stopBadgeText}>{stopNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.headText}>
            <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
              {pickup.businessName}
            </Text>
            <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
              {pickup.address}
            </Text>
          </View>

          <View style={[styles.chevronWell, { backgroundColor: colors.bg }]}>
            <Ionicons
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
            <Ionicons name="checkmark-circle" size={17} color={colors.success} />
            <Text style={[styles.collectedText, { color: colors.success }]}>
              {t('pickups.collected')}
            </Text>
          </View>
        ) : (
          <>
            <AnimatedPressable
              scaleTo={0.95}
              style={[styles.actionButton, { backgroundColor: colors.accentSoft }]}
              onPress={() => Linking.openURL(telUrl(pickup.contactPhone)).catch(() => {})}>
              <Ionicons name="call-outline" size={17} color={colors.accent} />
              <Text style={[styles.actionButtonText, { color: colors.accent }]}>
                {t('pickups.call')}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.95}
              style={[styles.actionButton, styles.actionButtonWide, { backgroundColor: colors.accent }]}
              onPress={() => openInMaps(pickup.address)}>
              <Ionicons name="navigate" size={16} color="#fff" />
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
    </View>
  );
}

export default function PickupsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [pickups, setPickups] = useState<Pickup[] | null>(null);
  const [segment, setSegment] = useState<PickupStatus>('SCHEDULED');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  // A drag and a scroll both follow the finger; only one of them may.
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    getPickups().then(setPickups);
  }, []);

  const scheduled = pickups?.filter((p) => p.status === 'SCHEDULED') ?? [];
  const completed = pickups?.filter((p) => p.status === 'COMPLETED') ?? [];
  const displayed = segment === 'SCHEDULED' ? scheduled : completed;

  // Expanding a stop is how the driver picks which ones they've actually
  // collected — "Done" then closes out exactly those, not the whole list.
  const selected = scheduled.filter((p) => expandedIds.has(p.id));

  async function handleDoneSelected() {
    if (selected.length === 0 || completing) return;

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
    setPickups(await completePickups(ids));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setCompleting(false);
    showToast(t('pickups.doneToast', { count: ids.length }));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleReorder(orderedIds: string[]) {
    // No reload here: the list already shows the new order, and swapping the
    // array out from under a just-settled drag makes it jump.
    await setPickupOrder(orderedIds);
    showToast(t('pickups.reorderedToast'));
  }

  const totalPackages = displayed.reduce((sum, p) => sum + p.packageCount, 0);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.backRow}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
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

      <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'SCHEDULED', label: t('pickups.segments.scheduled') },
            { value: 'COMPLETED', label: t('pickups.segments.completed') },
          ]}
          value={segment}
          onChange={setSegment}
        />

        {!pickups ? (
          <View style={styles.skeletonGroup}>
            <SkeletonBlock height={140} radius={Radii.card} />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={segment === 'SCHEDULED' ? 'cube-outline' : 'checkmark-done-outline'}
            title={
              segment === 'SCHEDULED' ? t('pickups.empty.scheduled') : t('pickups.empty.completed')
            }
          />
        ) : segment === 'SCHEDULED' ? (
          <DraggableList
            data={scheduled}
            idOf={pickupId}
            itemHeight={(pickup) => pickupHeight(pickup, expandedIds.has(pickup.id))}
            onReorder={handleReorder}
            onDragStateChange={setDragging}
            renderItem={(pickup, index, drag) => (
              <PickupCard
                pickup={pickup}
                colors={colors}
                scheme={scheme}
                stopNumber={index + 1}
                drag={drag}
                expanded={expandedIds.has(pickup.id)}
                onToggle={() => toggleExpand(pickup.id)}
                t={t}
              />
            )}
          />
        ) : (
          completed.map((pickup, i) => (
            <Animated.View
              key={pickup.id}
              entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
              <PickupCard
                pickup={pickup}
                colors={colors}
                scheme={scheme}
                readOnly
                expanded={expandedIds.has(pickup.id)}
                onToggle={() => toggleExpand(pickup.id)}
                t={t}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

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
            <Ionicons name="checkmark-done" size={17} color="#fff" />
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
  card: {
    flex: 1,
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 4,
    overflow: 'hidden',
  },
  cardEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
    gap: Spacing.md,
    minHeight: 44,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 10,
    color: '#fff',
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
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.smd,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.smd,
    paddingTop: Spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
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
    height: 42,
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
    height: PARCELS_HEADER_HEIGHT,
    lineHeight: PARCELS_HEADER_HEIGHT,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    height: PARCEL_ROW_HEIGHT,
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
