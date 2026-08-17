import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
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
  type ColorPalette,
} from '../constants';
import { enumLabel } from '../lib/enumLabel';
import { getReturns } from '../services/mock-api';
import type { Return, ReturnReason } from '../types';

const STAGGER_MS = 40;

function reasonColors(reason: ReturnReason, colors: ColorPalette) {
  switch (reason) {
    case 'REFUSED':
      return { color: colors.danger, background: colors.dangerSoft };
    case 'ADDRESS_ISSUE':
      return { color: colors.neutral, background: colors.neutralSoft };
    case 'DAMAGED':
      return { color: colors.info, background: colors.warningSoft };
  }
}

export default function ReturnsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [returns, setReturns] = useState<Return[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getReturns().then(setReturns);
    }, [])
  );

  const pendingIds = returns?.filter((r) => r.status === 'PENDING_PICKUP').map((r) => r.id) ?? [];
  const inBagCount = pendingIds.length;

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
          <Text style={[monoStyle(19, 'medium'), { color: colors.text }]}>{inBagCount}</Text>
          <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
            {t('returns.inBagLabel')}
          </Text>
        </View>
      </View>

      {!returns ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {returns.length === 0 && (
              <EmptyState icon="arrow-undo-outline" title={t('returns.empty')} />
            )}
            {returns.map((item, i) => {
              const rc = reasonColors(item.reason, colors);
              const processed = item.status === 'PROCESSED';
              const pending = item.status === 'PENDING_PICKUP';
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
                  style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                  <View style={[styles.accentBar, { backgroundColor: rc.color }]} />
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.orderId, { color: colors.text }]} numberOfLines={1}>
                      {t('returns.orderNumber', { id: item.relatedJobId })}
                    </Text>
                    <Text
                      style={[styles.reasonChip, { color: rc.color, backgroundColor: rc.background }]}
                      numberOfLines={1}>
                      {enumLabel(t, 'returnReason', item.reason)}
                    </Text>
                  </View>
                  <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                    {item.customerName} · {item.address}
                  </Text>
                  <View style={styles.bottomRow}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: processed ? colors.success : colors.textTertiary },
                      ]}>
                      {enumLabel(t, 'returnStatus', item.status)}
                    </Text>
                    {pending && item.reason === 'REFUSED' && (
                      <AnimatedPressable
                        scaleTo={0.95}
                        style={[styles.scanButton, { backgroundColor: colors.accent }]}
                        onPress={() => router.push('/scanner')}>
                        <Text style={styles.scanButtonText}>{t('returns.scan')}</Text>
                      </AnimatedPressable>
                    )}
                  </View>
                  {pending && item.reason === 'DAMAGED' && (
                    <View style={styles.photoRow}>
                      {(item.photoUris ?? []).map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                      ))}
                      {(item.photoUris?.length ?? 0) < 2 && (
                        <AnimatedPressable
                          scaleTo={0.9}
                          style={[styles.photoAdd, { borderColor: colors.separator }]}
                          onPress={() => router.push({ pathname: '/return-photo', params: { id: item.id } })}>
                          <Ionicons name="add" size={16} color={colors.textSecondary} />
                        </AnimatedPressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </ScrollView>

          {returns.length > 0 && (
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
                  router.push(
                    pendingIds.length > 0
                      ? { pathname: '/scanner', params: { batchIds: JSON.stringify(pendingIds) } }
                      : '/scanner'
                  )
                }>
                <Text style={styles.scanAllButtonText}>{t('returns.scanAll')}</Text>
              </AnimatedPressable>
            </View>
          )}
        </>
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
    gap: Spacing.sm,
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
  orderId: {
    ...monoStyle(15, 'medium'),
    flex: 1,
  },
  reasonChip: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  statusLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
  },
  photoAdd: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
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
