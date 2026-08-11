import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { type DayMark, MonthCalendar } from '../components/MonthCalendar';
import { SkeletonBlock } from '../components/Skeleton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';
import { addMonths, fromDateKey, isSameMonth, localeTag, toDateKey } from '../lib/date';
import { getAvailability, setAvailability } from '../services/mock-api';
import { AVAILABILITY_BLOCKS, type Availability, type AvailabilityBlock } from '../types';

const EMPTY_DAY = { morning: false, afternoon: false, evening: false };

const today = new Date();
const todayKey = toDateKey(today);
const maxMonth = addMonths(today, 2);

export default function AvailabilityScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [availability, setAvailabilityState] = useState<Availability | null>(null);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  useEffect(() => {
    getAvailability().then(setAvailabilityState);
  }, []);

  function toggleBlock(block: AvailabilityBlock) {
    setAvailabilityState((prev) => {
      if (!prev) return prev;
      const day = prev[selectedDateKey] ?? EMPTY_DAY;
      const next: Availability = {
        ...prev,
        [selectedDateKey]: { ...day, [block]: !day[block] },
      };
      setAvailability(next);
      return next;
    });
  }

  const markedDates = useMemo(() => {
    if (!availability) return {};
    const marks: Record<string, DayMark> = {};
    for (const [key, day] of Object.entries(availability)) {
      const activeCount = AVAILABILITY_BLOCKS.filter((b) => day[b]).length;
      if (activeCount === AVAILABILITY_BLOCKS.length) marks[key] = 'full';
      else if (activeCount > 0) marks[key] = 'partial';
    }
    return marks;
  }, [availability]);

  const monthAvailableCount = useMemo(() => {
    if (!availability) return 0;
    return Object.entries(availability).filter(([key, day]) => {
      return isSameMonth(fromDateKey(key), month) && AVAILABILITY_BLOCKS.some((b) => day[b]);
    }).length;
  }, [availability, month]);

  const selectedDay = availability?.[selectedDateKey] ?? EMPTY_DAY;
  const selectedLabel = fromDateKey(selectedDateKey).toLocaleDateString(localeTag(i18n.language), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const isPast = selectedDateKey < todayKey;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Availability</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[Typography.subhead, styles.intro, { color: colors.textSecondary }]}>
          Tap a date to mark the time blocks you&apos;re available to take routes. Dispatch uses
          this to plan upcoming assignments.
        </Text>

        {!availability ? (
          <SkeletonBlock height={340} radius={Radii.card} />
        ) : (
          <>
            <View
              style={[
                styles.calendarCard,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                selectedDateKey={selectedDateKey}
                onSelectDate={setSelectedDateKey}
                markedDates={markedDates}
                minDateKey={todayKey}
                maxMonth={maxMonth}
              />
            </View>

            <Animated.View
              key={selectedDateKey}
              entering={FadeInUp.springify(220).dampingRatio(1)}
              style={[
                styles.dayCard,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <Text style={[styles.dayCardTitle, { color: colors.text }]}>{selectedLabel}</Text>
              {isPast ? (
                <Text style={[Typography.footnote, { color: colors.textTertiary }]}>
                  Can&apos;t set availability for a past date.
                </Text>
              ) : (
                <View style={styles.blockRow}>
                  {AVAILABILITY_BLOCKS.map((block) => {
                    const active = selectedDay[block];
                    return (
                      <AnimatedPressable
                        key={block}
                        scaleTo={0.94}
                        onPress={() => toggleBlock(block)}
                        style={[
                          styles.blockChip,
                          { backgroundColor: active ? colors.accent : colors.separator },
                        ]}>
                        <Text
                          style={[
                            styles.blockChipText,
                            { color: active ? '#fff' : colors.textSecondary },
                          ]}>
                          {BLOCK_LABEL[block]}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>

            <Text style={[styles.summary, { color: colors.textSecondary }]}>
              {monthAvailableCount} {monthAvailableCount === 1 ? 'day' : 'days'} marked available
              this month
            </Text>
          </>
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
  intro: {
    lineHeight: 20,
  },
  calendarCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  dayCard: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dayCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  blockRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  blockChip: {
    flex: 1,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    paddingTop: Spacing.sm,
  },
});
