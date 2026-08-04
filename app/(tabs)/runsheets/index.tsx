import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Radii, Spacing, Typography, useColors } from '../../../constants';

const stops = [
  { id: '1', name: 'Amine Ben Salah', status: 'In Transit' },
  { id: '2', name: 'Karim Mejri', status: 'Pending' },
  { id: '3', name: 'Sarra Gharbi', status: 'Pending' },
];

export default function RunsheetsScreen() {
  const colors = useColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>
        Placeholder — real Runsheets list (segmented filter, next-stop card) lands after the mock
        data service.
      </Text>

      {stops.map((stop) => (
        <Link
          key={stop.id}
          href={{ pathname: '/job/[id]', params: { id: stop.id } }}
          style={[
            Typography.headline,
            styles.row,
            { backgroundColor: colors.bgElevated, borderRadius: Radii.xxl, color: colors.text },
          ]}>
          {stop.name} · {stop.status}
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  row: {
    padding: Spacing.lg,
  },
});
