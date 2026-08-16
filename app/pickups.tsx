import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
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
import { enumLabel } from '../lib/enumLabel';
import { telUrl } from '../lib/phone';
import { getPickups } from '../services/mock-api';
import type { Pickup, PickupStatus } from '../types';

const STAGGER_MS = 40;

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

interface PickupDetailsProps {
  pickup: Pickup;
  colors: ColorPalette;
  t: TFunction;
}

/** Expanded content shown under a pickup card/row — status, contact, navigate action, nested parcels. */
function PickupDetails({ pickup, colors, t }: PickupDetailsProps) {
  return (
    <Animated.View entering={FadeInDown.duration(180)} style={styles.details}>
      <View style={[styles.detailsDivider, { backgroundColor: colors.separator }]} />

      <View style={styles.detailStatusRow}>
        <Ionicons name="ellipse" size={8} color={colors.accent} />
        <Text style={[styles.detailStatusText, { color: colors.text }]}>
          {enumLabel(t, 'pickupStatus', pickup.status)}
        </Text>
      </View>

      <View style={styles.contactRow}>
        <View style={styles.contactInfo}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            {pickup.contactName} · {pickup.contactPhone}
          </Text>
        </View>
        <View style={styles.detailActions}>
          <AnimatedPressable
            scaleTo={0.88}
            style={[
              styles.detailActionButton,
              { backgroundColor: colors.accentSoft, borderColor: colors.accent },
            ]}
            onPress={() => Linking.openURL(telUrl(pickup.contactPhone))}>
            <Ionicons name="call-outline" size={16} color={colors.accent} />
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.95}
            style={[styles.navigateChip, { backgroundColor: colors.accent }]}
            onPress={() => openInMaps(pickup.address)}>
            <Ionicons name="navigate-outline" size={14} color="#fff" />
            <Text style={styles.navigateChipText}>{t('pickups.navigate')}</Text>
          </AnimatedPressable>
        </View>
      </View>

      {pickup.status === 'SCHEDULED' && (
        <PrimaryButton
          label={t('pickups.startPickup')}
          onPress={() => router.push('/scanner')}
          height={42}
          labelStyle={styles.startButtonLabel}
        />
      )}

      <Text style={[styles.parcelsTitle, { color: colors.textTertiary }]}>
        {t('pickups.parcelsTitle')}
      </Text>

      {pickup.parcels.map((parcel) => (
        <View
          key={parcel.trackingNumber}
          style={[styles.parcelRow, { borderColor: colors.separator }]}>
          <View style={styles.parcelInfo}>
            <Text style={[styles.parcelTracking, { color: colors.text }]}>
              {parcel.trackingNumber}
            </Text>
            <Text style={[styles.parcelContact, { color: colors.textSecondary }]}>
              {parcel.contactName}
            </Text>
          </View>
          <Text style={[styles.parcelCod, { color: colors.accent }]}>
            {formatCurrency(parcel.codAmount)}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

export default function PickupsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pickups, setPickups] = useState<Pickup[] | null>(null);
  const [segment, setSegment] = useState<PickupStatus>('SCHEDULED');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPickups().then(setPickups);
  }, []);

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

  const displayed = pickups?.filter((p) => p.status === segment) ?? [];
  const totalPackages = pickups?.reduce((sum, p) => sum + p.packageCount, 0) ?? 0;

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

      <ScrollView contentContainerStyle={styles.content}>
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
        ) : (
          <>
            {displayed.length === 0 ? (
              <EmptyState
                icon={segment === 'SCHEDULED' ? 'cube-outline' : 'checkmark-done-outline'}
                title={segment === 'SCHEDULED' ? t('pickups.empty.scheduled') : t('pickups.empty.completed')}
              />
            ) : (
              displayed.map((pickup, i) => {
                const isExpanded = expandedIds.has(pickup.id);
                return (
                  <Animated.View
                    key={pickup.id}
                    entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
                    style={[
                      styles.row,
                      { backgroundColor: colors.bgElevated },
                      getCardShadow(scheme),
                    ]}>
                    <View style={styles.rowTopLine}>
                      <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                        <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={[Typography.title3, styles.rowTitle, { color: colors.text }]}>
                          {pickup.businessName}
                        </Text>
                        <Text style={[Typography.subhead, { color: colors.textSecondary }]} numberOfLines={1}>
                          {pickup.timeWindow} · {t('common.package', { count: pickup.packageCount })}
                        </Text>
                      </View>
                      <AnimatedPressable
                        scaleTo={0.85}
                        hitSlop={10}
                        onPress={() => toggleExpand(pickup.id)}>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textTertiary}
                        />
                      </AnimatedPressable>
                    </View>
                    {isExpanded && <PickupDetails pickup={pickup} colors={colors} t={t} />}
                  </Animated.View>
                );
              })
            )}

            {segment === 'SCHEDULED' && (
              <AnimatedPressable
                scaleTo={0.98}
                style={[styles.addRow, { borderColor: colors.separator }]}
                onPress={() =>
                  showToast(t('common.comingSoon', { feature: t('pickups.addSpontaneous') }))
                }>
                <View style={[styles.addRowIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="add" size={18} color={colors.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[Typography.title3, styles.rowTitle, { color: colors.text }]}>
                    {t('pickups.addSpontaneous')}
                  </Text>
                  <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                    {t('pickups.addSpontaneousSubtitle')}
                  </Text>
                </View>
              </AnimatedPressable>
            )}
          </>
        )}
      </ScrollView>
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
  startButtonLabel: {
    fontSize: 13,
  },
  row: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: Spacing.lg,
  },
  addRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
  },
  details: {
    gap: Spacing.smd,
  },
  detailsDivider: {
    height: 1,
    marginTop: Spacing.smd,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStatusText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    flexShrink: 1,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailActionButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  navigateChipText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    color: '#fff',
  },
  parcelsTitle: {
    ...monoLabelStyle(11, 0.04),
    textTransform: 'uppercase',
    marginTop: 2,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  parcelInfo: {
    flex: 1,
  },
  parcelTracking: {
    ...monoStyle(13, 'medium'),
  },
  parcelContact: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    marginTop: 1,
  },
  parcelCod: {
    ...monoStyle(13, 'medium'),
  },
});
