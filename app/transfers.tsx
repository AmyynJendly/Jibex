import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';

import { AgencyFlow } from '../components/AgencyFlow';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { LoadError } from '../components/LoadError';
import { GlassIconButton } from '../components/GlassIconButton';
import { MetaChip } from '../components/MetaChip';
import { PrimaryButton } from '../components/PrimaryButton';
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
import { useScreenState, useTransfers } from '../lib/query';
import type { Transfer } from '../types';

type Toggle = 'current' | 'history';

export default function TransfersScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const transfersQuery = useTransfers();
  const screen = useScreenState([transfersQuery]);
  const transfers = transfersQuery.data ?? null;
  const [toggle, setToggle] = useState<Toggle>('current');
  const [qrTransferId, setQrTransferId] = useState<string | null>(null);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag(i18n.language), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const current = transfers?.filter((tr) => tr.status === 'IN_PROGRESS') ?? [];
  const history = transfers?.filter((tr) => tr.status === 'COMPLETED') ?? [];
  // History is read-only: no QR, no actions of any kind.
  const isHistory = toggle === 'history';
  const displayed = isHistory ? history : current;
  const parcelsMoving = current.reduce((sum, tr) => sum + tr.parcelCount, 0);

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
            {t('transfers.eyebrow')}
          </Text>
          <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
            {t('transfers.headerTitle')}
          </Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={[monoStyle(30, 'medium'), { color: colors.text }]}>{parcelsMoving}</Text>
          <Text style={[monoLabelStyle(10, 0.06), { color: colors.textTertiary }]}>
            {t('transfers.movingLabel')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'current', label: t('transfers.toggleCurrent') },
            { value: 'history', label: t('transfers.toggleHistory') },
          ]}
          value={toggle}
          onChange={setToggle}
        />

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
        ) : (
          displayed.map((transfer, i) => {
            const completed = transfer.status === 'COMPLETED';
            const accent = completed ? colors.success : colors.accent;
            const showingQr = qrTransferId === transfer.id;

            return (
              <View
                key={transfer.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.bgElevated },
                  getCardShadow(scheme),
                ]}>
                <View style={[styles.cardEdge, { backgroundColor: accent }]} />

                <View style={styles.cardTopRow}>
                  <Text style={[monoStyle(13, 'medium'), { color: colors.textSecondary }]}>
                    {transfer.id}
                  </Text>
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

                {!isHistory && (
                  <View style={[styles.actions, { borderTopColor: colors.separator }]}>
                    {showingQr ? (
                      <Animated.View entering={FadeInDown.duration(180)} style={styles.qrBlock}>
                        <View style={styles.qrCard}>
                          <QRCode value={`JIBEX-TRANSFER:${transfer.id}`} size={150} />
                        </View>
                        <Text
                          style={[Typography.caption2, styles.qrHint, { color: colors.textSecondary }]}>
                          {t('transfers.qrInfoNote')}
                        </Text>
                        <AnimatedPressable scaleTo={0.95} onPress={() => setQrTransferId(null)}>
                          <Text style={[Typography.footnote, { color: colors.accent }]}>
                            {t('transfers.hideQr')}
                          </Text>
                        </AnimatedPressable>
                      </Animated.View>
                    ) : (
                      <>
                        <PrimaryButton
                          label={t('transfers.showQr')}
                          height={46}
                          onPress={() => setQrTransferId(transfer.id)}
                        />
                        <AnimatedPressable
                          scaleTo={0.97}
                          style={[styles.scanButton, { borderColor: colors.separator }]}
                          onPress={() => router.push('/scanner')}>
                          <Ionicons name="scan-outline" size={16} color={colors.textSecondary} />
                          <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                            {t('transfers.scanToConfirm')}
                          </Text>
                        </AnimatedPressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
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
    gap: Spacing.md,
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
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 42,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qrBlock: {
    alignItems: 'center',
    gap: Spacing.smd,
    paddingVertical: Spacing.xs,
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  qrHint: {
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
});
