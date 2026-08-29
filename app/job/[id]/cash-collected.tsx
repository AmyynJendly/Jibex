import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Barcode } from '../../../components/Barcode';
import { InkStampSeal } from '../../../components/InkStampSeal';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { RollingDigits } from '../../../components/RollingDigits';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  useColors,
  morphIn,
} from '../../../constants';
import { localeTag } from '../../../lib/date';
import { formatCurrency } from '../../../lib/currency';
import { getJobDetail, getNextStopId, getRunsheets } from '../../../services/mock-api';

/** Best-effort "neighborhood" from a full street address — the segment before the city. */
function extractPlace(address: string) {
  const parts = address.split(',').map((p) => p.trim());
  return parts.length >= 3 ? parts[parts.length - 2] : parts[0];
}

export default function CashCollectedScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { id, cashAmount, previousTotal } = useLocalSearchParams<{
    id: string;
    cashAmount: string;
    previousTotal: string;
  }>();
  const [place, setPlace] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [nextStopId, setNextStopId] = useState<string | null | undefined>(undefined);
  const [nextStopName, setNextStopName] = useState<string | null>(null);

  useEffect(() => {
    getJobDetail(id).then((job) => setPlace(extractPlace(job.address)));
    getRunsheets().then((runsheets) => {
      const allStopIds = runsheets.flatMap((r) => r.stopIds);
      const index = allStopIds.indexOf(id);
      if (index !== -1) setPosition(index + 1);
    });
    getNextStopId(id).then((nextId) => {
      setNextStopId(nextId);
      if (nextId) getJobDetail(nextId).then((job) => setNextStopName(job.customerName));
    });
  }, [id]);

  const amount = Number(cashAmount);
  const before = Number(previousTotal);
  const after = before + amount;
  const confirmedAt = new Date().toLocaleTimeString(localeTag(i18n.language), {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Left-pad the shorter string so digit columns line up positionally from
  // the right (ones, tens, decimal, currency suffix) — `RollingDigits`
  // needs equal-length input.
  const rawFrom = formatCurrency(before);
  const rawTo = formatCurrency(after);
  const totalLength = Math.max(rawFrom.length, rawTo.length);
  const fromTotal = rawFrom.padStart(totalLength);
  const toTotal = rawTo.padStart(totalLength);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <InkStampSeal topText="JIBEX · SOUSSE" bottomText={confirmedAt} />

        <Animated.View
          entering={morphIn(120, 14)}
          style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('cashCollected.title', { index: position ?? '—' })}
          </Text>
          <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
            {t('cashCollected.subtitle', { time: confirmedAt, place })}
          </Text>
        </Animated.View>

        <Animated.View
          entering={morphIn(200, 14)}
          style={[
            styles.summaryCard,
            { backgroundColor: colors.bgElevated },
            getCardShadow(scheme),
          ]}>
          <View style={styles.summaryColumns}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('cashCollected.cashCollected')}
              </Text>
              <Text style={[styles.summaryAmount, { color: colors.success }]}>
                {formatCurrency(amount)}
              </Text>
            </View>
            <View style={[styles.summaryColDivider, { backgroundColor: colors.separator }]} />
            <View style={[styles.summaryCol, styles.summaryColRight]}>
              <Text style={[styles.summaryLabel, styles.summaryLabelRight, { color: colors.textSecondary }]}>
                {t('cashCollected.todaysTotal')}
              </Text>
              <RollingDigits from={fromTotal} to={toTotal} style={styles.summaryTotal} />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={styles.barcodeBlock}>
            <Barcode seed={id} color={colors.text} />
            <Text style={[monoStyle(11), { color: colors.textTertiary }]}>{id}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        {nextStopId && (
          <PrimaryButton
            label={
              nextStopName
                ? t('cashCollected.nextStopWithName', { name: nextStopName })
                : t('cashCollected.nextStop')
            }
            height={56}
            onPress={() => router.replace({ pathname: '/job/[id]', params: { id: nextStopId } })}
          />
        )}
        <Text
          onPress={() => router.navigate('/(tabs)/runsheets')}
          style={[styles.backLink, { color: colors.textSecondary }]}>
          {t('cashCollected.backToRunsheet')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: 18,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 26,
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
  summaryColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryColRight: {
    alignItems: 'flex-end',
  },
  summaryColDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.lg,
  },
  summaryLabel: {
    ...monoLabelStyle(10, 0.06),
    textTransform: 'uppercase',
  },
  summaryLabelRight: {
    textAlign: 'right',
  },
  summaryAmount: {
    ...monoStyle(24, 'medium'),
  },
  summaryTotal: {
    ...monoStyle(16, 'medium'),
  },
  divider: {
    height: 1,
  },
  barcodeBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: 30,
    gap: Spacing.md,
  },
  backLink: {
    fontFamily: Fonts.archivoSemiBold,
    textAlign: 'center',
    fontSize: 15,
  },
});
