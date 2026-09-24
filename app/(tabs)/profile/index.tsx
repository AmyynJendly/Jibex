import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { Barcode } from '../../../components/Barcode';
import { NativeSwitch } from '../../../components/NativeSwitch';
import { SkeletonBlock, SkeletonRow } from '../../../components/Skeleton';
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
import { CURRENCY_DECIMALS, formatDecimal } from '../../../lib/currency';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../lib/i18n';
import { useLanguage } from '../../../lib/i18n/LanguageProvider';
import { clearToken } from '../../../lib/token';
import { useHapticsEnabled } from '../../../lib/haptics';
import { useNextStopBarEnabled } from '../../../lib/nextStopBar';
import { supports } from '../../../lib/platformSupport';
import { useDriverStats, useRunsheets, useUser, useVehicle } from '../../../lib/query';
import type { DriverStats, User, Vehicle } from '../../../types';

interface AccountRow {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  soft: string;
  href: '/personal-info' | '/vehicle-details';
}

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { language, setLanguage } = useLanguage();
  const userQuery = useUser();
  const user = userQuery.data ?? null;
  const statsQuery = useDriverStats();
  const vehicleQuery = useVehicle();
  const runsheetsQuery = useRunsheets();

  const stats = statsQuery.data ?? null;
  const vehicle = vehicleQuery.data ?? null;
  const hub = runsheetsQuery.data?.[0]?.agency ?? null;
  const [biometricLogin, setBiometricLogin] = useState(true);
  const [newJobAlerts, setNewJobAlerts] = useState(true);
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHapticsEnabled();
  const { enabled: nextStopBarEnabled, setEnabled: setNextStopBarEnabled } =
    useNextStopBarEnabled();

  async function handleLogOut() {
    await clearToken();
    router.replace('/(auth)/login');
  }

  // Both open read-only detail screens — the agency owns this data, the
  // driver can view it but not edit it.
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
                <Icon name="person-outline" size={30} color="#7E5731" />
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
                {formatDecimal(stats.deliveryRate)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.deliveryRate')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.statItem}>
              {/* The number alone — the label right below it already says
                  "DT / Week", so `formatCurrency`'s own "TND" suffix would
                  name the same currency twice, in two different
                  abbreviations, on one stat. */}
              <Text style={[styles.statValueSmall, { color: colors.accent }]}>
                {formatDecimal(stats.weeklyCashCollected, CURRENCY_DECIMALS)}
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
                <View
                  key={row.key}>
                  <AnimatedPressable
                    onPress={() => router.push(row.href)}
                    style={[
                      styles.row,
                      i < accountRows.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.separator,
                      },
                    ]}>
                    <View style={[styles.rowIcon, { backgroundColor: row.soft }]}>
                      <Icon name={row.icon} size={15} color={row.color} />
                    </View>
                    <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                      {row.label}
                    </Text>
                    <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
                  </AnimatedPressable>
                </View>
              ))}
            </View>
          </View>

          {/* Settings live inline here rather than behind their own screen —
              there are few enough of them that a separate route was just an
              extra tap. */}
          <View>
            <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
              {t('settings.sectionLanguage')}
            </Text>
            <View
              style={[styles.listCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
              {SUPPORTED_LANGUAGES.map((code: SupportedLanguage, i) => {
                const selected = language === code;
                return (
                  <AnimatedPressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[
                      styles.row,
                      i < SUPPORTED_LANGUAGES.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.separator,
                      },
                    ]}>
                    <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                      {t(`settings.languages.${code}`)}
                    </Text>
                    {selected && <Icon name="checkmark" size={18} color={colors.accent} />}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
              {t('settings.sectionSecurity')}
            </Text>
            <View
              style={[styles.listCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
              <View
                style={[
                  styles.row,
                  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                ]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="finger-print-outline" size={16} color={colors.accent} />
                </View>
                <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                  {t('settings.biometricLogin')}
                </Text>
                <NativeSwitch
                  value={biometricLogin}
                  onValueChange={setBiometricLogin}
                />
              </View>
              <View
                style={[
                  styles.row,
                  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                ]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="phone-portrait-outline" size={15} color={colors.accent} />
                </View>
                <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                  {t('settings.hapticFeedback')}
                </Text>
                <NativeSwitch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                />
              </View>
              {/* Only on iPhones that can show the bar — a switch for
                  something that can't appear would just be noise. */}
              {supports.tabBarAccessory && (
                <View
                  style={[
                    styles.row,
                    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                  ]}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                    <Icon name="navigate-outline" size={15} color={colors.accent} />
                  </View>
                  <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                    {t('settings.nextStopBar')}
                  </Text>
                  <NativeSwitch value={nextStopBarEnabled} onValueChange={setNextStopBarEnabled} />
                </View>
              )}
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="notifications-outline" size={15} color={colors.accent} />
                </View>
                <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                  {t('settings.newJobAlerts')}
                </Text>
                <NativeSwitch
                  value={newJobAlerts}
                  onValueChange={setNewJobAlerts}
                />
              </View>
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
                  <Icon name="help-circle-outline" size={15} color={colors.warning} />
                </View>
                <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                  {t('profile.rows.helpCenter')}
                </Text>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </AnimatedPressable>
              <View
                style={[
                  styles.row,
                  {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.separator,
                  },
                ]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                  <Icon name="information-circle-outline" size={15} color={colors.textSecondary} />
                </View>
                <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                  {t('settings.appVersion')}
                </Text>
                <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                  {Constants.expoConfig?.version ?? '1.0.0'}
                </Text>
              </View>
              <AnimatedPressable onPress={handleLogOut} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
                  <Icon name="log-out-outline" size={15} color={colors.danger} />
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
  // All three figures share one line box even though the weekly total is set
  // smaller to fit. Without that they were three different heights in a
  // centre-aligned row, so each value and its label sat at its own offset —
  // the weekly figure was the obvious one, visibly shy of its slot.
  statValue: {
    ...monoStyle(18, 'medium'),
    lineHeight: 24,
    textAlign: 'center',
  },
  statValueSmall: {
    ...monoStyle(16, 'medium'),
    lineHeight: 24,
    textAlign: 'center',
  },
  statLabel: {
    ...monoLabelStyle(9, 0.1),
    marginTop: 2,
    textAlign: 'center',
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
