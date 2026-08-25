import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { EmptyState } from '../../../components/EmptyState';
import { ProgressBar } from '../../../components/ProgressBar';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import { SegmentedControl } from '../../../components/SegmentedControl';
import {
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  useColors,
  type ColorPalette,
} from '../../../constants';
import { enumLabel } from '../../../lib/enumLabel';
import { getRunsheets } from '../../../services/mock-api';
import type { Runsheet, RunsheetStatus } from '../../../types';

type Toggle = 'current' | 'history';

const STAGGER_MS = 40;

function statusColors(status: RunsheetStatus, colors: ColorPalette) {
  switch (status) {
    case 'VALIDE':
      return { color: colors.success, background: colors.successSoft };
    case 'A_CONFIRMER':
      return { color: colors.warning, background: colors.warningSoft };
    case 'EN_COURS':
    default:
      return { color: colors.accent, background: colors.accentSoft };
  }
}

interface RunsheetCardProps {
  runsheet: Runsheet;
  colors: ColorPalette;
  scheme: 'light' | 'dark';
  index: number;
}

function RunsheetCard({ runsheet, colors, scheme, index }: RunsheetCardProps) {
  const { t } = useTranslation();
  const sc = statusColors(runsheet.status, colors);

  return (
    <Animated.View entering={FadeInUp.delay(index * STAGGER_MS).springify(220).dampingRatio(1)}>
      <AnimatedPressable
        scaleTo={0.98}
        onPress={() => router.push(`/runsheet/${runsheet.id}`)}
        style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleBlock}>
            <Text style={[Typography.title3, { color: colors.text }]} numberOfLines={1}>
              {runsheet.routeLabel}
            </Text>
            <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
              {runsheet.agency} · {t('common.package', { count: runsheet.stopCount })}
            </Text>
          </View>
          <Text
            style={[styles.statusPill, { color: sc.color, backgroundColor: sc.background }]}
            numberOfLines={1}>
            {enumLabel(t, 'runsheetStatus', runsheet.status)}
          </Text>
        </View>

        <View style={styles.cardProgressRow}>
          <Text style={[monoStyle(12, 'medium'), { color: colors.textSecondary }]}>
            {t('runsheets.deliveredOf', { delivered: runsheet.deliveredCount, total: runsheet.stopCount })}
          </Text>
          <Text style={[monoStyle(12, 'medium'), { color: sc.color }]}>
            {runsheet.completionPercent}%
          </Text>
        </View>
        <ProgressBar percent={runsheet.completionPercent} color={sc.color} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RunsheetsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [runsheets, setRunsheets] = useState<Runsheet[] | null>(null);
  const [toggle, setToggle] = useState<Toggle>('current');

  const load = useCallback(async () => {
    setRunsheets(await getRunsheets());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const current = runsheets?.filter((r) => r.status !== 'VALIDE') ?? [];
  const history = runsheets?.filter((r) => r.status === 'VALIDE') ?? [];
  const primary = current.find((r) => r.status === 'EN_COURS') ?? null;
  const others = current.filter((r) => r.id !== primary?.id);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text style={[Typography.pageTitle, styles.headerTitle, { color: colors.text }]}>
          {t('runsheets.headerTitle')}
        </Text>

        <SegmentedControl
          segments={[
            { value: 'current', label: t('runsheets.toggleCurrent') },
            { value: 'history', label: t('runsheets.toggleHistory') },
          ]}
          value={toggle}
          onChange={setToggle}
        />

        {!runsheets ? (
          <View style={styles.skeletonGroup}>
            <SkeletonBlock height={110} radius={Radii.card} />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : toggle === 'current' ? (
          current.length === 0 ? (
            <EmptyState icon="file-tray-outline" title={t('runsheets.empty.current')} />
          ) : (
            <>
              {primary && (
                <View style={styles.section}>
                  <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
                    {t('runsheets.currentLabel')}
                  </Text>
                  <RunsheetCard runsheet={primary} colors={colors} scheme={scheme} index={0} />
                </View>
              )}
              {others.length > 0 && (
                <View style={styles.section}>
                  <Text style={[monoLabelStyle(11, 0.06), { color: colors.textTertiary }]}>
                    {t('runsheets.othersLabel')}
                  </Text>
                  <View style={styles.list}>
                    {others.map((r, i) => (
                      <RunsheetCard key={r.id} runsheet={r} colors={colors} scheme={scheme} index={i + 1} />
                    ))}
                  </View>
                </View>
              )}
            </>
          )
        ) : history.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title={t('runsheets.empty.history')} />
        ) : (
          <View style={styles.list}>
            {history.map((r, i) => (
              <RunsheetCard key={r.id} runsheet={r} colors={colors} scheme={scheme} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.mlg,
  },
  headerTitle: {
    fontSize: 26,
  },
  skeletonGroup: {
    gap: Spacing.mlg,
  },
  section: {
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    ...monoStyle(11),
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
});
