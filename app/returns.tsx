import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

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
  const pendingParcelTotal = pending.reduce((sum, r) => sum + r.parcelCount, 0);

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
          <Text style={[monoStyle(19, 'medium'), { color: colors.text }]}>{pendingParcelTotal}</Text>
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
                <View style={[styles.accentBar, { backgroundColor: accent }]} />
                <View style={styles.cardTopRow}>
                  <Text style={[styles.batchId, { color: colors.text }]} numberOfLines={1}>
                    {t('returns.batchNumber', { id: item.id })}
                  </Text>
                  <Text
                    style={[
                      styles.parcelChip,
                      { color: accent, backgroundColor: isHistory ? colors.successSoft : colors.warningSoft },
                    ]}
                    numberOfLines={1}>
                    {t('common.package', { count: item.parcelCount })}
                  </Text>
                </View>

                <View style={styles.agencyRow}>
                  <Text style={[styles.agencyText, { color: colors.text }]} numberOfLines={1}>
                    {item.fromAgency}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                  <Text style={[styles.agencyText, { color: colors.text }]} numberOfLines={1}>
                    {item.toAgency}
                  </Text>
                </View>

                <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.location} · {formatTime(item.scheduledAt)}
                </Text>
                {item.relatedTransferId && (
                  <Text style={[monoStyle(11), { color: colors.textTertiary }]}>
                    {t('returns.relatedTransfer', { id: item.relatedTransferId })}
                  </Text>
                )}

                <View style={styles.bottomRow}>
                  <Text
                    style={[
                      styles.statusLabel,
                      { color: isHistory ? colors.success : colors.textTertiary },
                    ]}>
                    {enumLabel(t, 'returnStatus', item.status)}
                  </Text>
                  {/* History is read-only — no scan action there. */}
                  {!isHistory && (
                    <AnimatedPressable
                      scaleTo={0.95}
                      style={[styles.scanButton, { backgroundColor: colors.accent }]}
                      onPress={() => router.push('/scanner')}>
                      <Text style={styles.scanButtonText}>{t('returns.scan')}</Text>
                    </AnimatedPressable>
                  )}
                </View>
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
            <Text style={styles.scanAllButtonText}>{t('returns.scanAll')}</Text>
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
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 6,
    gap: Spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  batchId: {
    ...monoStyle(15, 'medium'),
    flex: 1,
  },
  parcelChip: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  agencyText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    flexShrink: 1,
  },
  statusLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  scanButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  scanButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 12,
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
