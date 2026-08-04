import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radii, Spacing, Typography, useColors } from '../../constants';

export default function RegisterScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={[Typography.title1, { color: colors.text }]}>Create account</Text>
        <Text style={[Typography.callout, { color: colors.textSecondary, marginTop: Spacing.xxs }]}>
          Step 1 of 2 — full driver signup lands with the mock data service.
        </Text>

        <View style={{ flex: 1 }} />

        <Text
          onPress={() => router.replace('/(tabs)/home')}
          style={[
            Typography.headline,
            styles.primaryButton,
            { backgroundColor: colors.accent, borderRadius: Radii.pill, color: '#fff' },
          ]}>
          Continue
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
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  primaryButton: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
  },
});
