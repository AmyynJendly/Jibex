import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Radii, Spacing, Typography, useColors } from '../../../constants';

export default function ProfileScreen() {
  const colors = useColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>
        Placeholder — real Profile (avatar, stats, account/support lists) lands after the mock
        data service.
      </Text>

      <Text
        onPress={() => router.replace('/(auth)/login')}
        style={[
          Typography.headline,
          styles.row,
          { backgroundColor: colors.dangerSoft, borderRadius: Radii.xxl, color: colors.danger },
        ]}>
        Log Out
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
});
