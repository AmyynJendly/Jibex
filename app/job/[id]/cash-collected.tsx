import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radii, Spacing, Typography, useColors } from '../../../constants';

export default function CashCollectedScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Text style={[Typography.title1, { color: colors.success, textAlign: 'center' }]}>
          Delivery Confirmed
        </Text>
        <Text
          style={[
            Typography.callout,
            { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xxs },
          ]}>
          Stop #{id} completed — cash summary lands with the mock data service.
        </Text>

        <View style={{ flex: 1 }} />

        <Text
          onPress={() => router.navigate('/(tabs)/runsheets')}
          style={[
            Typography.headline,
            styles.primaryButton,
            { backgroundColor: colors.accent, borderRadius: Radii.pill, color: '#fff' },
          ]}>
          Back to Runsheets
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  primaryButton: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
  },
});
