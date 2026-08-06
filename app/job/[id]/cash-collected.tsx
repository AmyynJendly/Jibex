import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { DrawnCheckmark } from '../../../components/DrawnCheckmark';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../../../constants';
import { getNextStopId } from '../../../services/mock-api';

export default function CashCollectedScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { id, cashAmount, previousTotal } = useLocalSearchParams<{
    id: string;
    cashAmount: string;
    previousTotal: string;
  }>();
  const [nextStopId, setNextStopId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    getNextStopId(id).then(setNextStopId);
  }, [id]);

  const amount = Number(cashAmount);
  const before = Number(previousTotal);
  const after = before + amount;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Animated.View
          entering={ZoomIn.springify(280).dampingRatio(1)}
          style={styles.iconWrap}>
          <View style={[styles.iconOuter, { backgroundColor: colors.successSoft }]} />
          <View style={[styles.iconInner, { backgroundColor: colors.success }, checkGlow]}>
            <DrawnCheckmark size={30} color="#fff" strokeWidth={2.6} />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(120).springify(220).dampingRatio(1)}
          style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Delivery Confirmed</Text>
          <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
            Order #{id} completed
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).springify(220).dampingRatio(1)}
          style={[
            styles.summaryCard,
            { backgroundColor: colors.bgElevated },
            getCardShadow(scheme),
          ]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Cash Collected
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {amount.toFixed(2)} DT
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Today&apos;s Total
            </Text>
            <Text style={[styles.summaryTotal, { color: colors.text }]}>
              {before.toFixed(2)} DT → {after.toFixed(2)} DT
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        {nextStopId && (
          <PrimaryButton
            label="Next Stop"
            height={56}
            onPress={() => router.replace({ pathname: '/job/[id]', params: { id: nextStopId } })}
          />
        )}
        <Text
          onPress={() => router.navigate('/(tabs)/runsheets')}
          style={[styles.backLink, { color: colors.textSecondary }]}>
          Back to Runsheet
        </Text>
      </View>
    </SafeAreaView>
  );
}

const checkGlow = {
  shadowColor: '#1FAE5C',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.35,
  shadowRadius: 24,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: 18,
  },
  iconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.02 * 26,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.xxs,
  },
  summaryCard: {
    width: '100%',
    borderRadius: Radii.card,
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  footer: {
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: 30,
    gap: Spacing.md,
  },
  backLink: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
