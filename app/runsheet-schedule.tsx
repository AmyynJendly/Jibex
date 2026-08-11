import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { MonthCalendar } from '../components/MonthCalendar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { fromDateKey, localeTag, toDateKey } from '../lib/date';

const today = new Date();
const todayKey = toDateKey(today);

export default function RunsheetScheduleScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const isToday = selectedDateKey === todayKey;
  const selectedLabel = isToday
    ? t('runsheetSchedule.today')
    : fromDateKey(selectedDateKey).toLocaleDateString(localeTag(i18n.language), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>
          {t('runsheetSchedule.headerTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.calendarCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
          />
        </View>

        {isToday ? (
          <View
            style={[styles.resultCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {t('runsheetSchedule.viewingToday')}
            </Text>
            <Text style={[Typography.footnote, styles.resultBody, { color: colors.textSecondary }]}>
              {t('runsheetSchedule.viewingTodayBody')}
            </Text>
            <PrimaryButton
              label={t('runsheetSchedule.backToRunsheet')}
              height={46}
              onPress={() => router.back()}
              style={styles.resultButton}
            />
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={t('runsheetSchedule.emptyTitle', { date: selectedLabel })}
            subtitle={t('runsheetSchedule.emptyBody')}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: { width: 44 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  calendarCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  resultCard: {
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultBody: {
    textAlign: 'center',
  },
  resultButton: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
  },
});
