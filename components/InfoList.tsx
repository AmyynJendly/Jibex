import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';
import { ReadOnlyField } from './ReadOnlyField';
import { Fonts, Spacing, useColors } from '../constants';
import type { InfoListProps } from './InfoList.types';

/**
 * Read-only records on Android and web: a lock notice, then one labelled box
 * per value. iOS draws the same rows as a native grouped list instead
 * (`InfoList.ios.tsx`).
 */
export function InfoList({ rows, notice }: InfoListProps) {
  const colors = useColors();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={[styles.notice, { backgroundColor: colors.bgElevated }]}>
        <Icon name="lock-closed-outline" size={15} color={colors.textSecondary} />
        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{notice}</Text>
      </View>
      {rows.map((row) => (
        <ReadOnlyField key={row.label} label={row.label} value={row.value} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
  },
});
