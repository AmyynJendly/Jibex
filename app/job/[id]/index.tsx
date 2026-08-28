import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useToast } from '../../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getAccentGlow,
  getCardShadow,
  monoLabelStyle,
  monoStyle,
  useColors,
} from '../../../constants';
import { formatCurrency, formatDecimal } from '../../../lib/currency';
import { localeTag } from '../../../lib/date';
import { telUrl } from '../../../lib/phone';
import { FALLBACK_ORIGIN, haversineKm } from '../../../lib/geo';
import { useLiveCoords } from '../../../lib/useLiveCoords';
import { invalidateDeliveryData } from '../../../lib/query';
import { getJobDetail, getRunsheets, logCallAttempt } from '../../../services/mock-api';
import type { Job } from '../../../types';

/**
 * No-key static map image — shows the job's real location instead of a
 * placeholder. Yandex's static maps API is used because it needs no API key
 * (Google's Static Maps API does, and none is configured yet — see the
 * "real backend later" note on `openInMaps` above). Swap this for Google's
 * Static Maps API once a key is available, for full parity with `openInMaps`.
 */
function staticMapUrl({ lat, lng }: { lat: number; lng: number }) {
  return `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=15&l=map&size=640,300&pt=${lng},${lat},pm2rdl`;
}

/**
 * Drivers here use Google Maps, not Apple Maps — opens the native Google
 * Maps app when it's installed (registered as a queryable scheme in
 * `app.json`), otherwise falls back to the Google Maps web URL, which still
 * opens in the Google Maps app via universal link if it's present.
 */
async function openInMaps(job: Job) {
  const { lat, lng } = job.location;
  const label = encodeURIComponent(job.customerName);
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  const appUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&q=${label}&directionsmode=driving`,
    android: `google.navigation:q=${lat},${lng}`,
  });

  if (appUrl) {
    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    if (canOpen) {
      Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
      return;
    }
  }

  Linking.openURL(webUrl);
}

export default function JobDetailScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [position, setPosition] = useState<{ index: number; total: number } | null>(null);
  const liveCoords = useLiveCoords();
  const ripple = useSharedValue(0);

  useEffect(() => {
    ripple.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1
    );
  }, [ripple]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 1.6 }],
  }));

  useEffect(() => {
    getJobDetail(id).then(setJob);
    getRunsheets().then((runsheets) => {
      const allStopIds = runsheets.flatMap((r) => r.stopIds);
      const index = allStopIds.indexOf(id);
      if (index !== -1) {
        setPosition({ index: index + 1, total: allStopIds.length });
      }
    });
  }, [id]);

  if (!job) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  const distanceKm = haversineKm(liveCoords ?? FALLBACK_ORIGIN, job.location);
  const etaMinutes = Math.max(1, Math.round((distanceKm / 35) * 60));
  const etaTime = new Date(Date.now() + etaMinutes * 60_000).toLocaleTimeString(
    localeTag(i18n.language),
    { hour: '2-digit', minute: '2-digit' }
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        {position && (
          <View style={[styles.stopChip, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <Text style={[monoLabelStyle(12, 0.04), { color: colors.text }]}>
              {t('jobDetail.stopChip', { index: position.index, total: position.total })}
            </Text>
          </View>
        )}
        <GlassIconButton onPress={() => showToast(t('jobDetail.moreOptionsToast'))}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </GlassIconButton>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedPressable
          scaleTo={0.98}
          style={[styles.mapCard, getCardShadow(scheme)]}
          onPress={() => openInMaps(job)}>
          <Image
            source={{ uri: staticMapUrl(job.location) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.pinWrap}>
            <Animated.View
              style={[styles.pinRipple, { backgroundColor: colors.accent }, rippleStyle]}
            />
            <View style={[styles.pin, { backgroundColor: colors.accent }, getAccentGlow(0.35, 12)]}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.mapBadge}>
            {t('jobDetail.mapBadge', {
              distance: formatDecimal(distanceKm),
              minutes: etaMinutes,
            })}
          </Text>
          <Text style={styles.etaBadge}>{t('jobDetail.etaLabel', { time: etaTime })}</Text>
        </AnimatedPressable>

        <View
          style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.customerRow}>
            <Text style={[Typography.title3, { color: colors.text }]}>{job.customerName}</Text>
            <View style={styles.iconRow}>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                onPress={async () => {
                  // Logged before dialling so the attempt is recorded even if
                  // the dialler never opens — delivery is gated on this.
                  setJob(await logCallAttempt(job.id));
                  await invalidateDeliveryData();
                  Linking.openURL(telUrl(job.customerPhone)).catch(() => {});
                }}>
                <Ionicons name="call-outline" size={18} color={colors.accent} />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => showToast(t('common.messageToast'))}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
              </AnimatedPressable>
            </View>
          </View>
          <View style={styles.addressRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.textTertiary}
              style={styles.addressIcon}
            />
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {job.address}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={[monoLabelStyle(9, 0.12), { color: colors.textTertiary }]}>
                {t('jobDetail.billLabel')}
              </Text>
              <Text style={[monoStyle(13, 'medium'), { color: colors.text }]}>{job.id}</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.metaCol}>
              <Text style={[monoLabelStyle(9, 0.12), { color: colors.textTertiary }]}>
                {t('jobDetail.parcelLabel')}
              </Text>
              <Text style={[monoStyle(13, 'medium'), { color: colors.text }]}>
                {job.packageInfo.count} · {formatDecimal(job.packageInfo.weightLbs)} KG
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.separator }]} />
            <View style={styles.metaCol}>
              <Text style={[monoLabelStyle(9, 0.12), { color: colors.textTertiary }]}>
                {t('jobDetail.careLabel')}
              </Text>
              <Text
                style={[
                  monoStyle(13, 'medium'),
                  { color: job.packageInfo.fragile ? colors.danger : colors.text },
                ]}>
                {job.packageInfo.fragile ? t('jobDetail.fragile') : t('jobDetail.standard')}
              </Text>
            </View>
          </View>
          {job.packageInfo.note && (
            <Text style={[styles.note, { color: colors.textTertiary }]}>
              &quot;{job.packageInfo.note}&quot;
            </Text>
          )}
        </View>

        {job.cashToCollect > 0 && (
          <View
            style={[
              styles.codCard,
              { backgroundColor: colors.accent },
              getAccentGlow(0.28, 24),
            ]}>
            <View>
              <Text style={styles.codLabel}>{t('jobDetail.codLabel')}</Text>
              <Text style={styles.codAmount}>
                {t('jobDetail.codCash', { amount: formatCurrency(job.cashToCollect) })}
              </Text>
            </View>
            <Ionicons name="cash-outline" size={26} color="#fff" />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('jobDetail.startDelivery')}
          height={56}
          onPress={() => router.push({ pathname: '/job/[id]/otp', params: { id } })}
        />
        <AnimatedPressable
          scaleTo={0.97}
          style={[styles.secondaryButton, { backgroundColor: colors.dangerSoft }]}
          onPress={() => router.push({ pathname: '/job/[id]/cant-deliver', params: { id } })}>
          <Text style={[Typography.footnote, { color: colors.danger }]}>
            {t('jobDetail.deliveryFailed')}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  stopChip: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.mlg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.mlg,
  },
  mapCard: {
    height: 150,
    borderRadius: Radii.card,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinRipple: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A5FFF',
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A5FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBadge: {
    ...monoStyle(12),
    position: 'absolute',
    bottom: 12,
    left: 14,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  etaBadge: {
    ...monoStyle(12),
    position: 'absolute',
    bottom: 12,
    right: 14,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  card: {
    borderRadius: Radii.card,
    padding: Spacing.xl,
    gap: Spacing.smd,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    fontFamily: Fonts.archivoMedium,
    flex: 1,
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCol: {
    flex: 1,
    gap: 3,
  },
  metaDivider: {
    width: 1,
    height: 28,
    marginHorizontal: Spacing.md,
  },
  note: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    fontStyle: 'italic',
  },
  codCard: {
    borderRadius: Radii.card,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  codAmount: {
    ...monoStyle(26, 'medium'),
    color: '#fff',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.smd,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill / 2,
    paddingVertical: Spacing.md,
  },
});
