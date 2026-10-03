import type { ReactNode } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from './Icon';
import { MetaChip } from './MetaChip';
import { TrackingId } from './TrackingId';
import { Fonts, Radii, Spacing, getCardShadow, monoLabelStyle, useColors } from '../constants';
import { localeTag } from '../lib/date';
import { isRunForDay, runStatusKey, type RunStage } from '../lib/runsheetDay';
import type { Runsheet } from '../types';

interface RunsheetDayCardProps {
  runsheet: Runsheet;
  stage: RunStage;
  /** Local day, `YYYY-MM-DD` — decides between "Tournée du jour" and a dated title. */
  today: string;
  /** What the driver has to do about this run, if anything — under the header. */
  children?: ReactNode;
}

/** "ven. 2 oct." from `2026-10-02` — at noon, so no timezone can move the day. */
function formatRunDay(day: string, language: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString(localeTag(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * The run of the day, at the top of the Current tab: its code, its day, how
 * many parcels, and where it stands in plain words. The driver confirms a
 * RUN, not parcels, so the run is what the screen names first.
 */
export function RunsheetDayCard({ runsheet, stage, today, children }: RunsheetDayCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const isToday = !runsheet.scheduledDate || isRunForDay(runsheet, today);
  const dayLabel = runsheet.scheduledDate ? formatRunDay(runsheet.scheduledDate, i18n.language) : null;

  const waiting = stage === 'toConfirm' || stage === 'modified' || stage === 'toStart';
  const tone = waiting
    ? { fg: colors.warning, bg: colors.warningSoft }
    : stage === 'inProgress'
      ? { fg: colors.accent, bg: colors.accentSoft }
      : stage === 'done'
        ? { fg: colors.success, bg: colors.successSoft }
        : { fg: colors.textSecondary, bg: colors.bg };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgElevated, borderColor: waiting ? colors.warning : 'transparent' },
        getCardShadow(scheme),
      ]}>
      <View style={styles.topRow}>
        <Text style={[monoLabelStyle(11, 0.06), styles.eyebrow, { color: colors.textSecondary }]} numberOfLines={1}>
          {isToday || !dayLabel ? t('runsheets.day.today') : t('runsheets.day.other', { date: dayLabel })}
        </Text>
        <View style={[styles.status, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.fg }]} numberOfLines={1}>
            {t(runStatusKey(stage))}
          </Text>
        </View>
      </View>

      <TrackingId value={runsheet.code ?? runsheet.id} style={styles.code} />

      <View style={styles.metaRow}>
        {dayLabel && <MetaChip icon="calendar-outline" label={dayLabel} />}
        <MetaChip icon="cube-outline" tone="accent" label={t('common.package', { count: runsheet.stopCount })} />
      </View>

      {stage === 'closed' && (
        <View style={[styles.note, { borderTopColor: colors.separator }]}>
          <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <View style={styles.noteText}>
            <Text style={[styles.noteTitle, { color: colors.text }]}>{t('runsheets.day.closedTitle')}</Text>
            <Text style={[styles.noteBody, { color: colors.textSecondary }]}>{t('runsheets.day.closedBody')}</Text>
          </View>
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eyebrow: {
    flexShrink: 1,
  },
  status: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    flexShrink: 1,
  },
  statusText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  code: {
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noteText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  noteTitle: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  noteBody: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 17,
  },
});
