import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, useColors } from '../constants';
import { addMonths, fromDateKey, isSameMonth, toDateKey } from '../lib/date';
import { AnimatedPressable } from './AnimatedPressable';
import { GlassIconButton } from './GlassIconButton';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export type DayMark = 'full' | 'partial';

interface MonthCalendarProps {
  /** Any date within the month currently displayed. */
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  /** Dot styling per date key — 'full' (all blocks marked) vs 'partial' (some). */
  markedDates?: Record<string, DayMark>;
  /** Date keys before this one render disabled — can't set availability in the past. */
  minDateKey?: string;
  /** Furthest month the driver can navigate forward to. */
  maxMonth?: Date;
}

/** Monday-first day-of-week index (0 = Monday .. 6 = Sunday). */
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDateKey,
  onSelectDate,
  markedDates = {},
  minDateKey,
  maxMonth,
}: MonthCalendarProps) {
  const colors = useColors();

  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoBack = !minDateKey || !isSameMonth(month, fromDateKey(minDateKey));
  const canGoForward = !maxMonth || !isSameMonth(month, maxMonth);

  return (
    <View>
      <View style={styles.navRow}>
        <GlassIconButton
          size={36}
          onPress={() => canGoBack && onMonthChange(addMonths(month, -1))}
          style={!canGoBack && styles.navDisabled}>
          <Ionicons name="chevron-back" size={16} color={colors.text} />
        </GlassIconButton>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <GlassIconButton
          size={36}
          onPress={() => canGoForward && onMonthChange(addMonths(month, 1))}
          style={!canGoForward && styles.navDisabled}>
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </GlassIconButton>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: colors.textTertiary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;

          const key = toDateKey(date);
          const disabled = !!minDateKey && key < minDateKey;
          const selected = key === selectedDateKey;
          const mark = markedDates[key];

          return (
            <View key={i} style={styles.cell}>
              <AnimatedPressable
                scaleTo={0.9}
                disabled={disabled}
                onPress={() => onSelectDate(key)}
                style={[
                  styles.dayButton,
                  selected && { backgroundColor: colors.accent },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: selected
                        ? '#fff'
                        : disabled
                          ? colors.textTertiary
                          : colors.text,
                    },
                  ]}>
                  {date.getDate()}
                </Text>
                {mark && !selected && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: mark === 'full' ? colors.success : colors.warning,
                      },
                    ]}
                  />
                )}
              </AnimatedPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayButton: {
    width: '82%',
    height: '82%',
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
