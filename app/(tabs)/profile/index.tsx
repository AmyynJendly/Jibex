import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { Barcode } from '../../../components/Barcode';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  sectionLabelStyle,
  useColors,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { DISPATCH_PHONE, telUrl } from '../../../lib/phone';
import { clearToken } from '../../../lib/token';
import { getDriverStats, getRunsheets, getUser, getVehicle } from '../../../services/mock-api';
import type { DriverStats, User, Vehicle } from '../../../types';

const STAGGER_MS = 40;

interface AccountRow {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
  /** Right-aligned secondary value (e.g. a cash balance, a toggle state). */
  trailing?: string;
  /** When set, the row navigates here instead of showing the "coming soon" toast. */
  href?: '/personal-info' | '/vehicle-details' | '/bank-info';
}

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [hub, setHub] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [u, s, v, runsheets] = await Promise.all([
      getUser(),
      getDriverStats(),
      getVehicle(),
      getRunsheets(),
    ]);
    setUser(u);
    setStats(s);
    setVehicle(v);
    setHub(runsheets[0]?.agency ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleLogOut() {
    await clearToken();
    router.replace('/(auth)/login');
  }

  const accountRows: AccountRow[] = [
    {
      key: 'personal',
      label: t('profile.rows.personalInfo'),
      icon: 'person-outline',
      color: colors.accent,
      soft: colors.accentSoft,
      href: '/personal-info',
    },
    {
      key: 'vehicle',
      label: t('profile.rows.vehicleDetails'),
      icon: 'car-outline',
      color: colors.purple,
      soft: colors.purpleSoft,
      href: '/vehicle-details',
    },
    {
      key: 'bank',
      label: t('profile.rows.bankInfo'),
      icon: 'cash-outline',
      color: colors.success,
      soft: colors.successSoft,
      trailing: stats ? formatCurrency(stats.cashCollectedTotal) : undefined,
      href: '/bank-info',
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[Typography.pageTitle, { color: colors.text }]}>
          {t('profile.headerTitle')}
        </Text>
        <GlassIconButton size={40} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </GlassIconButton>
      </View>

      {!user || !stats ? (
        <View style={styles.skeletonGroup}>
          <SkeletonBlock height={96} radius={Radii.card + 2} />
          <SkeletonBlock height={86} radius={Radii.card} />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <>
          <View style={[styles.profileCard, getCardShadow(scheme)]}>
            {/* Fixed warm gradient, not theme-adaptive — same treatment as the
                design's driver card, which never switches to a neutral surface. */}
            <LinearGradient
              colors={['#EAB464', '#C99A6D', colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileCardTopRow}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={30} color="#7E5731" />
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.handle}>
                  {user.driverCode} · {hub ?? t('profile.hub')}
                </Text>
              </View>
            </View>

            {vehicle && (
              <View style={styles.plateRow}>
                <Barcode
                  seed={user.id + vehicle.plate}
                  color="rgba(46,52,57,0.55)"
                  width={150}
                  height={20}
                />
                <Text style={styles.plateText}>{vehicle.plate}</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.bgElevated },
              getCardShadow(scheme),
            ]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.lifetimeDeliveries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.lifetimeDeliveries')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats.onTimeRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.onTimeRate')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValueSmall, { color: colors.accent }]}>
                {formatCurrency(stats.weeklyCashCollected)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.weeklyCash')}
              </Text>
            </View>
          </View>

          <View>
            <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
              {t('profile.sectionAccount')}
            </Text>
            <View
              style={[
                styles.listCard,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              {accountRows.map((row, i) => (
                <Animated.View
                  key={row.key}
                  entering={FadeInUp.delay(i * STAGGER_MS).springify(220).dampingRatio(1)}>
                  <AnimatedPressable
                    onPress={() =>
                      row.href ? router.push(row.href) : showToast(t('common.comingSoon', { feature: row.label }))
                    }
                    style={[
                      styles.row,
                      i < accountRows.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.separator,
                      },
                    ]}>
                    <View style={[styles.rowIcon, { backgroundColor: row.soft }]}>
                      <Ionicons name={row.icon} size={15} color={row.color} />
                    </View>
                    <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                      {row.label}
                    </Text>
                    {row.trailing && (
                      <Text style={[monoStyle(12, 'medium'), { color: colors.textSecondary }]}>
                        {row.trailing}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </View>
          </View>

          <View>
            <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
              {t('profile.sectionSupport')}
            </Text>
            <View
              style={[
                styles.listCard,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <Animated.View
                entering={FadeInUp.delay(accountRows.length * STAGGER_MS)
                  .springify(220)
                  .dampingRatio(1)}>
                <AnimatedPressable
                  onPress={() => Linking.openURL(telUrl(DISPATCH_PHONE))}
                  style={[
                    styles.row,
                    {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.separator,
                    },
                  ]}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="call-outline" size={15} color={colors.accent} />
                  </View>
                  <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                    {t('profile.rows.callDispatch')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </AnimatedPressable>
              </Animated.View>
              <Animated.View
                entering={FadeInUp.delay((accountRows.length + 1) * STAGGER_MS)
                  .springify(220)
                  .dampingRatio(1)}>
                <AnimatedPressable
                  onPress={() => router.push('/help-center')}
                  style={[
                    styles.row,
                    {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.separator,
                    },
                  ]}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="help-circle-outline" size={15} color={colors.warning} />
                  </View>
                  <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                    {t('profile.rows.helpCenter')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </AnimatedPressable>
              </Animated.View>
              <Animated.View
                entering={FadeInUp.delay((accountRows.length + 2) * STAGGER_MS)
                  .springify(220)
                  .dampingRatio(1)}>
                <AnimatedPressable onPress={handleLogOut} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
                    <Ionicons name="log-out-outline" size={15} color={colors.danger} />
                  </View>
                  <Text
                    style={[
                      Typography.body,
                      styles.rowLabel,
                      styles.logOutLabel,
                      { color: colors.danger },
                    ]}>
                    {t('profile.rows.logOut')}
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xxl,
    // `contentInsetAdjustmentBehavior="automatic"` already accounts for the
    // safe-area top inset — this is just breathing room on top of that.
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonGroup: {
    gap: Spacing.xl,
  },
  profileCard: {
    borderRadius: Radii.card + 2,
    overflow: 'hidden',
    gap: Spacing.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  profileCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plateText: {
    ...monoStyle(12, 'medium'),
    color: 'rgba(46,52,57,0.6)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radii.xl,
    backgroundColor: 'rgba(255,252,248,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,248,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 19,
    color: '#2E3439',
  },
  handle: {
    ...monoStyle(12),
    color: 'rgba(46,52,57,0.7)',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.card,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...monoStyle(18, 'medium'),
  },
  statValueSmall: {
    ...monoStyle(16, 'medium'),
  },
  statLabel: {
    ...monoLabelStyle(9, 0.1),
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionLabel: {
    paddingLeft: 2,
    marginBottom: Spacing.sm,
  },
  listCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  logOutLabel: {
    fontFamily: Fonts.archivoBold,
  },
});
