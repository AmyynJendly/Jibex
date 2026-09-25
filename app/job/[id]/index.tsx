import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useIsPreview, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { TrackingId } from '../../../components/TrackingId';
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
import { callCustomer, openInMaps } from '../../../lib/stopActions';
import { FALLBACK_ORIGIN, haversineKm } from '../../../lib/geo';
import { useLiveCoords } from '../../../lib/useLiveCoords';
import { useNow } from '../../../lib/useNow';
import { invalidateDeliveryData } from '../../../lib/query';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import {
  confirmDelivery,
  getDriverStats,
  getJobDetail,
  getRunsheets,
} from '../../../services/mock-api';
import type { Job } from '../../../types';

/**
 * No-key static map image — shows the job's real location instead of a
 * placeholder. Yandex's static maps API is used because it needs no API key
 * (Google's Static Maps API does, and none is configured yet — see the
 * "real backend later" note on `openInMaps` in lib/stopActions). Swap this for Google's
 * Static Maps API once a key is available, for full parity with `openInMaps`.
 */
function staticMapUrl({ lat, lng }: { lat: number; lng: number }) {
  return `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=15&l=map&size=640,300&pt=${lng},${lat},pm2rdl`;
}

/** Phones get Apple's navigation bar; the web keeps the drawn header. */
const nativeBar = Platform.OS !== 'web';

export default function JobDetailScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();
  const [delivering, setDelivering] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  // Shown inside a long-press preview: the actions sit in the menu below it
  // there, so the Delivered / Failed buttons would only be clutter.
  const isPreview = useIsPreview();
  const [job, setJob] = useState<Job | null>(null);
  const [position, setPosition] = useState<{ index: number; total: number } | null>(null);
  const liveCoords = useLiveCoords();
  const now = useNow();
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
  const etaTime = new Date(now + etaMinutes * 60_000).toLocaleTimeString(
    localeTag(i18n.language),
    { hour: '2-digit', minute: '2-digit' }
  );

  /** Logged before dialling so the attempt counts even if the dialler never opens — delivery is gated on it. */
  async function handleCall() {
    if (!job) return;
    setJob(await callCustomer(job));
  }

  function handleMenuAction(action: string) {
    if (!job) return;
    if (action === 'call') handleCall();
    else if (action === 'navigate') openInMaps(job);
    else if (action === 'cantDeliver') router.push({ pathname: '/job/[id]/cant-deliver', params: { id } });
  }

  const menuActions = [
    { id: 'call', title: t('runsheets.call'), icon: 'phone' },
    { id: 'navigate', title: t('jobDetail.navigate'), icon: 'arrow.triangle.turn.up.right.diamond' },
    { id: 'cantDeliver', title: t('jobDetail.cantDeliver'), icon: 'xmark.circle' },
  ] as const;

  /**
   * Marks the parcel delivered from the doorstep.
   *
   * This replaces a button that only opened the scanner flow, so the driver
   * had to go two screens deep to record the ordinary outcome. The gates the
   * OTP and photo routes enforce still apply — the run has to be signed for,
   * and the customer has to have been called — and the reason surfaces as a
   * toast rather than the press silently doing nothing.
   *
   * It then lands on the same cash receipt the other two routes end on, so
   * the money is confirmed the same way however the delivery was recorded.
   */
  async function handleDelivered() {
    if (!job || delivering) return;
    if (!requireOnline()) return;

    setDelivering(true);
    const previousTotal = (await getDriverStats()).cashCollectedTotal;
    const result = await confirmDelivery(job.id, job.cashToCollect);
    setDelivering(false);

    if (!result.success) {
      showToast(t(result.error ?? 'common.genericError'));
      return;
    }

    await invalidateDeliveryData();
    router.replace({
      pathname: '/job/[id]/cash-collected',
      params: {
        id: job.id,
        cashAmount: String(job.cashToCollect),
        previousTotal: String(previousTotal),
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {nativeBar ? (
        <>
          {/* Apple's bar: the stop number as the title, a system back button
              (this is the first screen of the stop's own stack, so iOS adds
              none by itself) and the system ⋯ menu. */}
          <Stack.Screen
            options={{
              title: position
                ? t('jobDetail.stopChip', { index: position.index, total: position.total })
                : '',
            }}
          />
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              icon="chevron.left"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel={t('jobDetail.a11yMore')}>
              {menuActions.map((action) => (
                <Stack.Toolbar.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={() => handleMenuAction(action.id)}>
                  {action.title}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar>
        </>
      ) : (
        <View style={styles.header}>
          <GlassIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <Icon name="chevron-back" size={20} color={colors.textSecondary} />
          </GlassIconButton>
          {position && (
            <View style={[styles.stopChip, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
              <Text style={[monoLabelStyle(12, 0.04), { color: colors.text }]}>
                {t('jobDetail.stopChip', { index: position.index, total: position.total })}
              </Text>
            </View>
          )}
          <GlassIconButton
            accessibilityLabel={t('jobDetail.a11yMore')}
            onPress={() => showToast(t('jobDetail.moreOptionsToast'))}>
            <Icon name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </GlassIconButton>
        </View>
      )}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <AnimatedPressable
          scaleTo={0.98}
          style={[styles.mapCard, getCardShadow(scheme)]}
          onPress={() => openInMaps(job)}>
          {/* expo-image caches this between visits and fades it in, instead
              of refetching the same tile every time the screen opens. */}
          <Image
            source={{ uri: staticMapUrl(job.location) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
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
              <Icon name="location" size={16} color="#fff" />
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
          {/* The id gets its own full-width row. It was previously squeezed
              into a third of the meta strip, where it was literally clipped
              mid-code — and this is the one field the driver checks against
              the label on the box before handing it over. */}
          <View style={styles.idRow}>
            <TrackingId value={job.id} />
            {job.packageInfo.fragile && (
              <View style={[styles.careChip, { backgroundColor: colors.dangerSoft }]}>
                <Icon name="alert-circle" size={13} color={colors.danger} />
                <Text style={[styles.careChipText, { color: colors.danger }]}>
                  {t('jobDetail.fragile')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.customerRow}>
            <Text style={[Typography.title3, styles.customerName, { color: colors.text }]}>
              {job.customerName}
            </Text>
            <View style={styles.iconRow}>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                onPress={handleCall}>
                <Icon name="call-outline" size={18} color={colors.accent} />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => showToast(t('common.messageToast'))}>
                <Icon name="chatbubble-outline" size={18} color={colors.accent} />
              </AnimatedPressable>
            </View>
          </View>
          {job.callAttempts > 0 && (
            <View style={styles.callDetailRow}>
              <Icon name="call-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.callDetailText, { color: colors.textTertiary }]}>
                {t('jobDetail.callDetail', {
                  count: job.callAttempts,
                  time: job.lastCallAt
                    ? new Date(job.lastCallAt).toLocaleTimeString(localeTag(i18n.language), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—',
                })}
              </Text>
            </View>
          )}
          <View style={styles.addressRow}>
            <Icon
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

          {/* Facts as chips rather than three columns split by hairlines. The
              columns forced every value into a third of the width whether it
              needed it or not, which is what clipped the id and left the
              other two swimming in space. */}
          <View style={styles.factRow}>
            <View style={[styles.factChip, { backgroundColor: colors.bg }]}>
              <Icon name="cube-outline" size={14} color={colors.textSecondary} />
              <Text style={[monoStyle(12, 'medium'), { color: colors.text }]}>
                {t('jobDetail.parcelCount', { count: job.packageInfo.count })} ·{' '}
                {formatDecimal(job.packageInfo.weightLbs)} KG
              </Text>
            </View>
            <View style={[styles.factChip, { backgroundColor: colors.bg }]}>
              <Icon name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[monoStyle(12, 'medium'), { color: colors.text }]}>
                {t('jobDetail.etaLabel', { time: etaTime })}
              </Text>
            </View>
          </View>

          {/* Promoted out of a grey italic footnote. It is an instruction from
              the customer about how to complete the drop — the driver needs to
              read it before knocking, not discover it afterwards. */}
          {job.packageInfo.note && (
            <View style={[styles.noteCallout, { backgroundColor: colors.warningSoft }]}>
              <Icon name="information-circle" size={16} color={colors.warning} />
              <Text style={[styles.note, { color: colors.text }]}>{job.packageInfo.note}</Text>
            </View>
          )}
        </View>

        {job.cashToCollect > 0 && (
          <View
            style={[
              styles.codCard,
              { backgroundColor: colors.accent },
              getAccentGlow(0.28, 24),
            ]}>
            {/* `flex: 1` + `minWidth: 0` is what makes this wrap instead of
                push the icon out of the card — French labels run longer than
                English ones, and a row with an unconstrained text sibling
                just grows past the card's edge instead of yielding. */}
            <View style={styles.codText}>
              <Text style={styles.codLabel} numberOfLines={1}>
                {t('jobDetail.codLabel')}
              </Text>
              <Text style={styles.codAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatCurrency(job.cashToCollect)}
              </Text>
            </View>
            <View style={styles.codIcon}>
              <Icon name="cash-outline" size={22} color="#fff" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* The two outcomes of standing at the door, side by side: it went
          wrong on the left, it went right on the left-to-right reading order's
          end. Delivered is the wider of the two because it is the one pressed
          on almost every stop. */}
      {!isPreview && (
        <View style={styles.footer}>
          <AnimatedPressable
            scaleTo={0.97}
            accessibilityRole="button"
            style={[styles.failedButton, { backgroundColor: colors.dangerSoft }]}
            onPress={() => router.push({ pathname: '/job/[id]/cant-deliver', params: { id } })}>
            <Icon name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={[Typography.footnote, { color: colors.danger }]}>
              {t('jobDetail.deliveryFailed')}
            </Text>
          </AnimatedPressable>
          <PrimaryButton
            label={t('jobDetail.markDelivered')}
            height={56}
            loading={delivering}
            style={styles.deliveredButton}
            onPress={handleDelivered}
          />
        </View>
      )}
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
    // Grow to fill the screen so the map can take up the slack. This stop has
    // little text, and pinning the actions to the bottom used to leave a tall
    // band of empty background in the middle of the screen.
    flexGrow: 1,
  },
  mapCard: {
    // Absorbs whatever height the content doesn't need, down to the original
    // 150 on a long stop. A bigger map is the most useful thing to put there.
    flex: 1,
    minHeight: 150,
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
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  careChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.xs,
  },
  careChipText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  customerName: {
    flex: 1,
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
  callDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -Spacing.xs,
  },
  callDetailText: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
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
  factRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  factChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  noteCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.smd,
    borderRadius: Radii.md,
  },
  note: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    flex: 1,
  },
  codCard: {
    borderRadius: Radii.card,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  codText: {
    flex: 1,
    minWidth: 0,
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
  codIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.smd,
  },
  failedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 56,
    borderRadius: Radii.pill,
  },
  deliveredButton: {
    flex: 1.4,
  },
});
