import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AgencyFlow } from '../components/AgencyFlow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkeletonRow } from '../components/Skeleton';
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
import { enumLabel } from '../lib/enumLabel';
import { getReturns } from '../services/mock-api';
import type { Return } from '../types';

type Toggle = 'current' | 'history';

const STAGGER_MS = 40;

export default function ReturnsScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [returns, setReturns] = useState<Return[] | null>(null);
  const [toggle, setToggle] = useState<Toggle>('current');

  useFocusEffect(
    useCallback(() => {
      getReturns().then(setReturns);
    }, [])
  );

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

      <ScrollView contentContainerStyle={styles.content}>
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

        {!returns ? (
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
        ) : (
          displayed.map((item, i) => {
            const accent = isHistory ? colors.success : colors.warning;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
                style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                <View style={[styles.cardEdge, { backgroundColor: accent }]} />

                <View style={styles.cardTopRow}>
                  <Text style={[monoStyle(13, 'medium'), { color: colors.textSecondary }]}>
                    {t('returns.batchNumber', { id: item.id })}
                  </Text>
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
                  <View style={[styles.metaChip, { backgroundColor: colors.bg }]}>
                    <Ionicons name="arrow-undo-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.text }]}>
                      {t('common.package', { count: item.parcelCount })}
                    </Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: colors.bg }]}>
                    <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: colors.bg }]}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.text }]}>
                      {formatTime(item.scheduledAt)}
                    </Text>
                  </View>
                </View>

                {item.relatedTransferId && (
                  <View style={styles.sourceRow}>
                    <Ionicons name="git-branch-outline" size={13} color={colors.textTertiary} />
                    <Text style={[monoStyle(11), { color: colors.textTertiary }]} numberOfLines={1}>
                      {t('returns.relatedTransfer', { id: item.relatedTransferId })}
                    </Text>
                  </View>
                )}

                {/* History is read-only — no scan action there. */}
                {!isHistory && (
                  <View style={[styles.actions, { borderTopColor: colors.separator }]}>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={[styles.scanButton, { backgroundColor: colors.accent }]}
                      onPress={() =>
                        router.push({
                          pathname: '/scanner',
                          params: { batchIds: JSON.stringify([item.id]) },
                        })
                      }>
                      <Ionicons name="scan-outline" size={16} color="#fff" />
                      <Text style={styles.scanButtonText}>{t('returns.scan')}</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {!isHistory && pending.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgElevated, borderTopColor: colors.separator },
          ]}>
          <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
            {t('returns.scanNote')}
          </Text>
          <AnimatedPressable
            scaleTo={0.95}
            style={[styles.scanAllButton, { backgroundColor: colors.warning }]}
            onPress={() =>
              router.push({
                pathname: '/scanner',
                params: { batchIds: JSON.stringify(pending.map((r) => r.id)) },
              })
            }>
            <Ionicons name="scan" size={16} color="#2E3439" />
            <Text style={styles.scanAllButtonText}>
              {t('returns.scanAllWithCount', { count: pending.length })}
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
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 4,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    flexShrink: 1,
  },
  metaText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  actions: {
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.full,
  },
  scanButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
    color: '#fff',
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
  scanAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.smd,
    borderRadius: Radii.full,
  },
  scanAllButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
    color: '#2E3439',
  },
});
