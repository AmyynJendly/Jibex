import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { MetaChip } from './MetaChip';
import { PrimaryButton } from './PrimaryButton';
import { TrackingId } from './TrackingId';
import { Fonts, Radii, Spacing, getCardShadow, monoLabelStyle, monoStyle, useColors } from '../constants';
import { localeTag } from '../lib/date';
import { isRunForDay, runChange, runChangeText, runCounts, runStatusKey, type RunStage } from '../lib/runsheetDay';
import { useRunsheetConfirm } from '../lib/useRunsheetConfirm';
import type { Runsheet } from '../types';

interface RunsheetDayCardProps {
  runsheet: Runsheet;
  stage: RunStage;
  /** Local day, `YYYY-MM-DD` — decides between "Tournée du jour" and a dated title. */
  today: string;
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
 *
 * Under the header, what the driver has to do about it, if anything:
 * accept a new run, accept a run the agency changed, or start it.
 */
export function RunsheetDayCard({ runsheet, stage, today }: RunsheetDayCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const runsheetConfirm = useRunsheetConfirm();
  const refuseLabel = runsheetConfirm.refuseLabel(runsheet);
  const isToday = !runsheet.scheduledDate || isRunForDay(runsheet, today);
  const dayLabel = runsheet.scheduledDate ? formatRunDay(runsheet.scheduledDate, i18n.language) : null;

  const waiting = stage === 'toConfirm' || stage === 'modified' || stage === 'toStart';
  // Not before the run starts: three zeros say nothing.
  const counts = stage === 'toConfirm' || stage === 'toStart' ? null : runCounts(runsheet);
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

      {/* Where the run stands in numbers, once it is being delivered. */}
      {counts && (
        <View style={styles.counts}>
          <View style={styles.count}>
            <Text style={[styles.countValue, { color: colors.success }]}>{counts.delivered}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>{t('runsheets.day.counts.delivered')}</Text>
          </View>
          <View style={styles.count}>
            <Text style={[styles.countValue, { color: colors.danger }]}>{counts.failed}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>{t('runsheets.day.counts.failed')}</Text>
          </View>
          <View style={styles.count}>
            <Text style={[styles.countValue, { color: colors.warning }]}>{counts.remaining}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>{t('runsheets.day.counts.remaining')}</Text>
          </View>
        </View>
      )}

      {stage === 'closed' && (
        <View style={[styles.note, { borderTopColor: colors.separator }]}>
          <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <View style={styles.noteText}>
            <Text style={[styles.noteTitle, { color: colors.text }]}>{t('runsheets.day.closedTitle')}</Text>
            <Text style={[styles.noteBody, { color: colors.textSecondary }]}>{t('runsheets.day.closedBody')}</Text>
          </View>
        </View>
      )}

      {stage === 'done' && (
        <View style={[styles.note, { borderTopColor: colors.separator }]}>
          <Icon name="checkmark-done-outline" size={16} color={colors.success} />
          <View style={styles.noteText}>
            <Text style={[styles.noteBody, { color: colors.textSecondary }]}>{t('runsheets.day.doneBody')}</Text>
          </View>
        </View>
      )}

      {waiting && (
        <View style={[styles.action, { borderTopColor: colors.separator }]}>
          {stage === 'modified' ? (
            // What changed, in numbers: "1 colis ajouté (12 → 13)".
            <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
              <Icon name="alert-circle-outline" size={17} color={colors.warning} />
              <Text style={[styles.bannerText, { color: colors.text }]}>
                {runChangeText(t, runChange(runsheet))}
              </Text>
            </View>
          ) : (
            <View style={styles.noteText}>
              <Text style={[styles.noteTitle, { color: colors.text }]}>{runsheetConfirm.title(runsheet)}</Text>
              <Text style={[styles.noteBody, { color: colors.textSecondary }]}>
                {stage === 'toStart' ? t('runsheets.day.startBody') : t('runsheets.day.newBody')}
              </Text>
            </View>
          )}
          <PrimaryButton
            label={runsheetConfirm.actionLabel(runsheet)}
            height={46}
            loading={runsheetConfirm.sending}
            loadingLabel={t('common.sending')}
            onPress={() => runsheetConfirm.confirmReceipt(runsheet)}
          />
          {/* Refusing is the rare case, so it's a quiet text button under
              the main one, and it asks for a reason. */}
          {refuseLabel && (
            <AnimatedPressable
              scaleTo={0.97}
              accessibilityRole="button"
              disabled={runsheetConfirm.sending}
              style={styles.refuseButton}
              onPress={() => runsheetConfirm.refuse(runsheet)}>
              <Text style={[styles.refuseText, { color: colors.danger }]}>{refuseLabel}</Text>
            </AnimatedPressable>
          )}
        </View>
      )}
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
  counts: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  count: {
    gap: 1,
  },
  countValue: {
    ...monoStyle(20, 'medium'),
  },
  countLabel: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
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
  action: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
  },
  bannerText: {
    flex: 1,
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  refuseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: -Spacing.xs,
  },
  refuseText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
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
