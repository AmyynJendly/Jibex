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
import { Radii, Spacing, Typography, getCardShadow, useColors, type ColorPalette } from '../constants';
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
            style={[styles.detailActionButton, { backgroundColor: colors.accentSoft }]}
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

  const scheduled = pickups?.filter((p) => p.status === 'SCHEDULED') ?? [];
  const completed = pickups?.filter((p) => p.status === 'COMPLETED') ?? [];
  const nextPickup = segment === 'SCHEDULED' ? scheduled[0] : undefined;
  const restPickups = segment === 'SCHEDULED' ? scheduled.slice(1) : completed;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('pickups.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
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
            {nextPickup &&
              (() => {
                const isExpanded = expandedIds.has(nextPickup.id);
                return (
                  <Animated.View
                    entering={FadeInUp.springify(220).dampingRatio(1)}
                    style={[
                      styles.nextCard,
                      { backgroundColor: colors.bgElevated, borderColor: colors.accent },
                      getCardShadow(scheme),
                    ]}>
                    <View style={styles.nextCardTopRow}>
                      <Text style={[styles.nextCardLabel, { color: colors.accent }]}>
                        {t('pickups.nextPickup')}
                      </Text>
                      <View style={styles.nextCardTopRight}>
                        <Text
                          style={[
                            styles.timeChip,
                            { color: colors.text, backgroundColor: colors.separator },
                          ]}>
                          {nextPickup.timeWindow}
                        </Text>
                        <AnimatedPressable
                          scaleTo={0.85}
                          onPress={() => toggleExpand(nextPickup.id)}
                          hitSlop={8}>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textTertiary}
                          />
                        </AnimatedPressable>
                      </View>
                    </View>
                    <Text style={[Typography.title3, { color: colors.text }]}>
                      {nextPickup.businessName}
                    </Text>
                    <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                      {nextPickup.address}
                    </Text>
                    <View style={styles.nextCardBottomRow}>
                      <Text style={[styles.packageCount, { color: colors.textTertiary }]}>
                        {t('common.package', { count: nextPickup.packageCount })}
                      </Text>
                      <PrimaryButton
                        label={t('pickups.startPickup')}
                        onPress={() => router.push('/scanner')}
                        height={38}
                        style={styles.startButton}
                        labelStyle={styles.startButtonLabel}
                      />
                    </View>
                    {isExpanded && <PickupDetails pickup={nextPickup} colors={colors} t={t} />}
                  </Animated.View>
                );
              })()}

            {restPickups.length === 0 && !nextPickup ? (
              <EmptyState
                icon={segment === 'SCHEDULED' ? 'cube-outline' : 'checkmark-done-outline'}
                title={segment === 'SCHEDULED' ? t('pickups.empty.scheduled') : t('pickups.empty.completed')}
              />
            ) : (
              restPickups.map((pickup, i) => {
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
                        <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: {
    width: 44,
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
  nextCard: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.xl,
    gap: Spacing.smd,
  },
  nextCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.04 * 12,
  },
  timeChip: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md - 4,
    overflow: 'hidden',
  },
  nextCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  packageCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  startButton: {
    paddingHorizontal: Spacing.xl,
  },
  startButtonLabel: {
    fontSize: 13,
  },
  row: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
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
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  parcelsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.04 * 11,
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
    fontSize: 13,
    fontWeight: '700',
  },
  parcelContact: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  parcelCod: {
    fontSize: 13,
    fontWeight: '700',
  },
});
