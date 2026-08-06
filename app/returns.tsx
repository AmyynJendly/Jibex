import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EmptyState } from '../components/EmptyState';
import { GlassIconButton } from '../components/GlassIconButton';
import { SkeletonRow } from '../components/Skeleton';
import { Radii, Spacing, Typography, getCardShadow, useColors, type ColorPalette } from '../constants';
import { getReturns } from '../services/mock-api';
import type { Return, ReturnReason, ReturnStatus } from '../types';

const STAGGER_MS = 40;

const REASON_LABEL: Record<ReturnReason, string> = {
  refused: 'Refused',
  'address-issue': 'Address Issue',
  damaged: 'Damaged',
};

const STATUS_LABEL: Record<ReturnStatus, string> = {
  'pending-pickup': 'Pending Pickup',
  processed: 'Processed',
};

function reasonColors(reason: ReturnReason, colors: ColorPalette) {
  switch (reason) {
    case 'refused':
      return { color: colors.danger, background: colors.dangerSoft };
    case 'address-issue':
      return { color: colors.neutral, background: colors.neutralSoft };
    case 'damaged':
      return { color: colors.info, background: colors.infoSoft };
  }
}

export default function ReturnsScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [returns, setReturns] = useState<Return[] | null>(null);

  useEffect(() => {
    getReturns().then(setReturns);
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Returns</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!returns ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {returns.length === 0 && (
            <EmptyState icon="arrow-undo-outline" title="No pending returns" />
          )}
          {returns.map((item, i) => {
            const rc = reasonColors(item.reason, colors);
            const processed = item.status === 'processed';
            return (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}
                style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.orderId, { color: colors.text }]}>
                    Order #{item.relatedJobId}
                  </Text>
                  <Text style={[styles.reasonChip, { color: rc.color, backgroundColor: rc.background }]}>
                    {REASON_LABEL[item.reason]}
                  </Text>
                </View>
                <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                  {item.customerName} · {item.address}
                </Text>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: processed ? colors.success : colors.textTertiary },
                  ]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 30,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
  },
  reasonChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
