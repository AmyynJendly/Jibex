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
  Radii,
  Spacing,
  Typography,
  getAccentGlow,
  getCardShadow,
  useColors,
} from '../../../constants';
import { formatCurrency } from '../../../lib/currency';
import { telUrl } from '../../../lib/phone';
import { getJobDetail, getRunsheets } from '../../../services/mock-api';
import type { Job } from '../../../types';

/** Driver's approximate start point — Sousse/Sahloul depot (mirrors mock-api's DEPOT). */
const DEPOT = { lat: 35.848, lng: 10.5975 };

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

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
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [position, setPosition] = useState<{ index: number; total: number } | null>(null);
  const [agency, setAgency] = useState<string | null>(null);
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
      const owningRunsheet = runsheets.find((r) => r.stopIds.includes(id));
      setAgency(owningRunsheet?.agency ?? null);
    });
  }, [id]);

  if (!job) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  const distanceMiles = haversineMiles(DEPOT, job.location);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        {position && (
          <View style={styles.headerTitleWrap}>
            <Text style={[Typography.cardTitle, { color: colors.text }]}>
              {t('jobDetail.stopOf', { index: position.index, total: position.total })}
            </Text>
            {agency && (
              <Text style={[styles.headerAgency, { color: colors.textSecondary }]}>{agency}</Text>
            )}
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
            <Animated.View style={[styles.pinRipple, rippleStyle]} />
            <View style={[styles.pin, getAccentGlow(0.35, 12)]}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.mapBadge}>
            {t('jobDetail.mapBadge', {
              distance: distanceMiles.toFixed(1),
              minutes: Math.max(1, Math.round((distanceMiles / 22) * 60)),
            })}
          </Text>
          <View style={styles.navigateChip}>
            <Ionicons name="navigate" size={13} color="#fff" />
            <Text style={styles.navigateText}>{t('jobDetail.navigate')}</Text>
          </View>
        </AnimatedPressable>

        <View
          style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
          <View style={styles.customerRow}>
            <Text style={[Typography.title3, { color: colors.text }]}>{job.customerName}</Text>
            <View style={styles.iconRow}>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => Linking.openURL(telUrl(job.customerPhone))}>
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
          <View style={styles.packageRow}>
            <View style={[styles.packageIcon, { backgroundColor: colors.separator }]}>
              <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
              {t('jobDetail.packageInfo', {
                count: job.packageInfo.count,
                weight: job.packageInfo.weightLbs,
              })}
              {job.packageInfo.fragile ? ` · ${t('jobDetail.fragile')}` : ''}
            </Text>
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
        <Text
          onPress={() => router.push({ pathname: '/job/[id]/cant-deliver', params: { id } })}
          style={[styles.cancel, { color: colors.danger }]}>
          {t('jobDetail.cantDeliver')}
        </Text>
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerAgency: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
    position: 'absolute',
    bottom: 12,
    left: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  navigateChip: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A5FFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  navigateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  packageIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  codAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.01 * 26,
    color: '#fff',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.smd,
  },
  cancel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
