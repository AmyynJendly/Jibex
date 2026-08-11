import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { GlassSurface } from '../../../components/GlassSurface';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import {
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  sectionLabelStyle,
  useColors,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { clearToken } from '../../../lib/token';
import { getDriverStats, getUser } from '../../../services/mock-api';
import type { DriverStats, User } from '../../../types';

const STAGGER_MS = 40;

/** Tunisian mobile numbers are 8 digits after the +216 country code. */
function formatPhone(username: string) {
  const digits = username.replace(/\D/g, '');
  const local = digits.startsWith('216') ? digits.slice(3) : digits;
  return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)}`;
}

interface AccountRow {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
  /** When set, the row navigates here instead of showing the "coming soon" toast. */
  href?: '/personal-info' | '/vehicle-details' | '/bank-info' | '/availability';
}

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([getUser(), getDriverStats()]);
    setUser(u);
    setStats(s);
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
      href: '/bank-info',
    },
    {
      key: 'availability',
      label: t('profile.rows.availability'),
      icon: 'calendar-outline',
      color: colors.warning,
      soft: colors.warningSoft,
      href: '/availability',
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[Typography.pageTitle, { color: colors.text }]}>{t('profile.headerTitle')}</Text>
        <GlassIconButton size={40} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </GlassIconButton>
      </View>

      {!user || !stats ? (
        <View style={styles.skeletonGroup}>
          <SkeletonBlock height={230} radius={Radii.pill} />
          <SkeletonBlock height={86} radius={Radii.card} />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <>
          <GlassSurface style={styles.profileCard}>
            <LinearGradient
              colors={[colors.accentSoft, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: colors.separator }]}>
                <Ionicons name="person-outline" size={42} color={colors.textTertiary} />
              </View>
              <AnimatedPressable
                scaleTo={0.85}
                style={[
                  styles.editBadge,
                  { backgroundColor: colors.accent, borderColor: colors.bgElevated },
                ]}
                onPress={() => showToast(t('profile.editPhotoToast'))}>
                <Ionicons name="pencil" size={13} color="#fff" />
              </AnimatedPressable>
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
              <Text style={[styles.handle, { color: colors.textSecondary }]}>
                {formatPhone(user.username)}
              </Text>
            </View>
            <View
              style={[
                styles.ratingPill,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <Ionicons name="star" size={14} color="#FF9F0A" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {t('profile.rating', { rating: '4.92' })}
              </Text>
            </View>
          </GlassSurface>

          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.bgElevated },
              getCardShadow(scheme),
            ]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.delivered}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.delivered')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats.completionPercent}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.completion')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValueSmall, { color: colors.accent }]}>
                {formatCurrency(stats.cashCollectedTotal)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.cashCollected')}
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
                entering={FadeInUp.delay((accountRows.length + 1) * STAGGER_MS)
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
    borderRadius: Radii.pill,
    overflow: 'hidden',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 84,
    height: 84,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    alignItems: 'center',
  },
  name: {
    fontSize: 21,
    fontWeight: '800',
  },
  handle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 15,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 19,
    fontWeight: '800',
  },
  statValueSmall: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    fontWeight: '600',
  },
});
