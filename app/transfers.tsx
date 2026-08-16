import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SkeletonRow } from '../components/Skeleton';
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
} from '../constants';
import { localeTag } from '../lib/date';
import { getRunsheets, getTransfers } from '../services/mock-api';
import type { Transfer } from '../types';

const STAGGER_MS = 40;

/** "Route 12" → "R-12" — matches the design's abbreviated route labels. */
function abbreviateRoute(label: string) {
  return label.replace(/^Route\s*/i, 'R-');
}

export default function TransfersScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [myRoute, setMyRoute] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag(i18n.language), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function routeLabel(route: string) {
    const abbreviated = abbreviateRoute(route);
    return route === myRoute ? `${abbreviated} · ${t('transfers.you')}` : abbreviated;
  }

  useEffect(() => {
    getTransfers().then(setTransfers);
    getRunsheets().then((runsheets) => setMyRoute(runsheets[0]?.routeLabel ?? null));
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <View style={styles.headerTitleWrap}>
          <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
            {t('transfers.eyebrow')}
          </Text>
          <Text style={[Typography.headline, { color: colors.text }]}>
            {t('transfers.headerTitle')}
          </Text>
        </View>
        <GlassIconButton
          onPress={() =>
            showToast(t('common.comingSoon', { feature: t('transfers.initiateTransfer') }))
          }>
          <Ionicons name="add" size={22} color={colors.text} />
        </GlassIconButton>
      </View>

      {!transfers ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {transfers.length === 0 && (
            <EmptyState icon="swap-horizontal-outline" title={t('transfers.empty')} />
          )}

          {transfers.map((transfer, i) => {
            const completed = transfer.status === 'COMPLETED';
            const statusColor = completed ? colors.success : colors.accent;
            const statusSoft = completed ? colors.successSoft : colors.accentSoft;
            const isExpanded = expandedIds.has(transfer.id);
            return (
              <Animated.View
                key={transfer.id}
                entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.bgElevated, opacity: completed ? 0.7 : 1 },
                    getCardShadow(scheme),
                  ]}>
                  <AnimatedPressable
                    scaleTo={0.98}
                    onPress={() => toggleExpand(transfer.id)}
                    style={styles.cardTopRow}>
                    <Text style={[styles.routeLabel, { color: colors.text }]} numberOfLines={1}>
                      {abbreviateRoute(transfer.origin)}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                    <Text style={[styles.routeLabel, { color: colors.text }]} numberOfLines={1}>
                      {abbreviateRoute(transfer.destination)}
                    </Text>
                    <View style={styles.cardSpacer} />
                    <Text
                      style={[styles.statusChip, { color: statusColor, backgroundColor: statusSoft }]}
                      numberOfLines={1}>
                      {completed ? t('transfers.status.completed') : t('transfers.status.awaitingHandoff')}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textTertiary}
                    />
                  </AnimatedPressable>
                  <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                    {t('transfers.detailLine', {
                      count: t('common.package', { count: transfer.itemCount }),
                      location: transfer.location,
                      time: formatTime(transfer.scheduledAt),
                    })}
                  </Text>

                  {isExpanded && (
                    <Animated.View
                      entering={FadeInDown.duration(180)}
                      style={[styles.expandedBlock, { borderTopColor: colors.separator }]}>
                      <View style={styles.swapRow}>
                        <View style={styles.swapBox}>
                          <Text style={[monoLabelStyle(9, 0.1), { color: colors.textTertiary }]}>
                            {t('transfers.from')}
                          </Text>
                          <Text style={[styles.swapValue, { color: colors.text }]} numberOfLines={1}>
                            {routeLabel(transfer.origin)}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                        <View style={[styles.swapBox, styles.swapBoxRight]}>
                          <Text style={[monoLabelStyle(9, 0.1), { color: colors.textTertiary }]}>
                            {t('transfers.to')}
                          </Text>
                          <Text style={[styles.swapValue, { color: colors.text }]} numberOfLines={1}>
                            {routeLabel(transfer.destination)}
                          </Text>
                        </View>
                      </View>
                      {!completed && (
                        <PrimaryButton
                          label={t('transfers.showQr')}
                          height={44}
                          onPress={() =>
                            showToast(t('common.comingSoon', { feature: t('transfers.showQr') }))
                          }
                        />
                      )}
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            );
          })}

          {transfers.length > 0 && (
            <View style={[styles.infoNote, { backgroundColor: colors.bg }]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
                {t('transfers.qrInfoNote')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
    gap: Spacing.md,
  },
  expandedBlock: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  swapBox: {
    flex: 1,
    gap: 2,
  },
  swapBoxRight: {
    alignItems: 'flex-end',
  },
  swapValue: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
  },
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: Spacing.smd,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  cardSpacer: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  statusChip: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoNoteText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
  },
});
