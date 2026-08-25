import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
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
import { getTransfers } from '../services/mock-api';
import type { Transfer } from '../types';

type Toggle = 'current' | 'history';

const STAGGER_MS = 40;

export default function TransfersScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [toggle, setToggle] = useState<Toggle>('current');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [qrTransferId, setQrTransferId] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      getTransfers().then(setTransfers);
    }, [])
  );

  const current = transfers?.filter((tr) => tr.status === 'IN_PROGRESS') ?? [];
  const history = transfers?.filter((tr) => tr.status === 'COMPLETED') ?? [];
  const displayed = toggle === 'current' ? current : history;
  // History is read-only: no expanding, no QR, no actions of any kind.
  const isHistory = toggle === 'history';

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
        <View style={styles.headerSpacer} />
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

        {!transfers ? (
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
            const statusColor = completed ? colors.success : colors.accent;
            const statusSoft = completed ? colors.successSoft : colors.accentSoft;
            const isExpanded = !isHistory && expandedIds.has(transfer.id);
            return (
              <Animated.View
                key={transfer.id}
                entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.bgElevated, opacity: completed ? 0.75 : 1 },
                    getCardShadow(scheme),
                  ]}>
                  {isHistory ? (
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.agencyLabel, { color: colors.text }]} numberOfLines={1}>
                        {transfer.originAgency}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                      <Text style={[styles.agencyLabel, { color: colors.text }]} numberOfLines={1}>
                        {transfer.destinationAgency}
                      </Text>
                      <View style={styles.cardSpacer} />
                      <Text
                        style={[styles.statusChip, { color: statusColor, backgroundColor: statusSoft }]}
                        numberOfLines={1}>
                        {t('transfers.status.completed')}
                      </Text>
                    </View>
                  ) : (
                    <AnimatedPressable
                      scaleTo={0.98}
                      onPress={() => toggleExpand(transfer.id)}
                      style={styles.cardTopRow}>
                      <Text style={[styles.agencyLabel, { color: colors.text }]} numberOfLines={1}>
                        {transfer.originAgency}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                      <Text style={[styles.agencyLabel, { color: colors.text }]} numberOfLines={1}>
                        {transfer.destinationAgency}
                      </Text>
                      <View style={styles.cardSpacer} />
                      <Text
                        style={[styles.statusChip, { color: statusColor, backgroundColor: statusSoft }]}
                        numberOfLines={1}>
                        {t('transfers.status.awaitingHandoff')}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textTertiary}
                      />
                    </AnimatedPressable>
                  )}

                  <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                    {t('transfers.detailLine', {
                      count: transfer.parcelCount,
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
                            {transfer.originAgency}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                        <View style={[styles.swapBox, styles.swapBoxRight]}>
                          <Text style={[monoLabelStyle(9, 0.1), { color: colors.textTertiary }]}>
                            {t('transfers.to')}
                          </Text>
                          <Text style={[styles.swapValue, { color: colors.text }]} numberOfLines={1}>
                            {transfer.destinationAgency}
                          </Text>
                        </View>
                      </View>

                      {qrTransferId === transfer.id ? (
                        <View style={styles.qrBlock}>
                          <View style={styles.qrCard}>
                            <QRCode value={`JIBEX-TRANSFER:${transfer.id}`} size={140} />
                          </View>
                          <Text style={[monoStyle(11), { color: colors.textTertiary }]}>
                            {transfer.id}
                          </Text>
                          <AnimatedPressable scaleTo={0.95} onPress={() => setQrTransferId(null)}>
                            <Text style={[Typography.footnote, { color: colors.accent }]}>
                              {t('transfers.hideQr')}
                            </Text>
                          </AnimatedPressable>
                        </View>
                      ) : (
                        <>
                          <PrimaryButton
                            label={t('transfers.showQr')}
                            height={44}
                            onPress={() => setQrTransferId(transfer.id)}
                          />
                          <AnimatedPressable
                            scaleTo={0.97}
                            style={[styles.scanToConfirmButton, { borderColor: colors.separator }]}
                            onPress={() => router.push('/scanner')}>
                            <Ionicons name="scan-outline" size={16} color={colors.textSecondary} />
                            <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                              {t('transfers.scanToConfirm')}
                            </Text>
                          </AnimatedPressable>
                        </>
                      )}
                    </Animated.View>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}

        {!isHistory && current.length > 0 && (
          <View style={[styles.infoNote, { backgroundColor: colors.bg }]}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
              {t('transfers.qrInfoNote')}
            </Text>
          </View>
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
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
  qrBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  scanToConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 40,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
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
  agencyLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    flexShrink: 1,
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
