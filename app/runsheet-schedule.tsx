import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { MonthCalendar } from '../components/MonthCalendar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { fromDateKey, toDateKey } from '../lib/date';

const today = new Date();
const todayKey = toDateKey(today);

export default function RunsheetScheduleScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const isToday = selectedDateKey === todayKey;
  const selectedLabel = isToday
    ? 'Today'
    : fromDateKey(selectedDateKey).toLocaleDateString(undefined, {
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
        <Text style={[Typography.headline, { color: colors.text }]}>Schedule</Text>
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
            <Text style={[styles.resultTitle, { color: colors.text }]}>Viewing today&apos;s runsheet</Text>
            <Text style={[Typography.footnote, styles.resultBody, { color: colors.textSecondary }]}>
              Go back to see today&apos;s stops, in optimized route order.
            </Text>
            <PrimaryButton
              label="Back to Runsheet"
              height={46}
              onPress={() => router.back()}
              style={styles.resultButton}
            />
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={`No runsheet loaded for ${selectedLabel}`}
            subtitle="Other days will show up here once Jibex is connected to your dispatch system."
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
