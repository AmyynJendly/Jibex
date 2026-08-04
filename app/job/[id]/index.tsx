import { Link, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Radii, Spacing, Typography, useColors } from '../../../constants';

export default function JobDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[Typography.title1, { color: colors.text }]}>Stop #{id}</Text>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>
        Placeholder — real Job Detail (map, package info, COD amount) lands after the mock data
        service.
      </Text>

      <Link
        href={{ pathname: '/job/[id]/otp', params: { id } }}
        style={[
          Typography.headline,
          styles.row,
          { backgroundColor: colors.accent, borderRadius: Radii.pill, color: '#fff' },
        ]}>
        Start Delivery
      </Link>

      <Text
        onPress={() => router.back()}
        style={[Typography.callout, styles.cancel, { color: colors.danger }]}>
        Can&apos;t Deliver
      </Text>
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
  cancel: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
