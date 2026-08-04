import { ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing, Typography, useColors } from '../constants';

export default function TransfersScreen() {
  const colors = useColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>
        Placeholder — real Transfers (route handoff cards, Initiate Transfer) lands after the mock
        data service.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xxl,
  },
});
