import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Radii, Spacing, Typography, useColors } from '../../../constants';

export default function OtpScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[Typography.title1, { color: colors.text }]}>Confirm Delivery</Text>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>
        Placeholder for stop #{id} — real 4-digit OTP entry lands after the mock data service.
      </Text>

      <Link
        href={{ pathname: '/job/[id]/cash-collected', params: { id } }}
        style={[
          Typography.headline,
          styles.row,
          { backgroundColor: colors.accent, borderRadius: Radii.pill, color: '#fff' },
        ]}>
        Verify &amp; Complete
      </Link>
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
    textAlign: 'center',
  },
});
