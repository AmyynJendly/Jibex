import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  monoLabelStyle,
  monoStyle,
  useColors,
  type ColorPalette,
} from '../../../constants';
import { telUrl } from '../../../lib/phone';
import { confirmDeliveryWithOTP, getDriverStats, getJobDetail } from '../../../services/mock-api';
import type { Job } from '../../../types';

const OTP_LENGTH = 4;
const RESEND_SECONDS = 24;
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['sms', '0', 'del'],
] as const;

interface OtpBoxProps {
  digit: string | undefined;
  active: boolean;
  error: boolean;
  colors: ColorPalette;
}

/** A single OTP box — border color/width animate smoothly between idle/active/error instead of snapping. */
function OtpBox({ digit, active, error, colors }: OtpBoxProps) {
  // 0 = idle (separator), 1 = active (accent), 2 = active + error (danger)
  // Only the active box ever changes color — the error state shouldn't tint every box red.
  const target = active ? (error ? 2 : 1) : 0;
  const progress = useSharedValue(target);

  useEffect(() => {
    progress.value = withTiming(target, { duration: 180 });
  }, [target, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      [colors.separator, colors.accent, colors.danger]
    ),
    borderWidth: interpolate(progress.value, [0, 1, 2], [1, 2, 2]),
  }));

  return (
    <Animated.View
      style={[styles.otpBox, { backgroundColor: colors.bgElevated }, animatedStyle]}>
      <Text style={[styles.otpDigit, { color: digit ? colors.text : colors.textTertiary }]}>
        {digit ?? '_'}
      </Text>
    </Animated.View>
  );
}

export default function OtpScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const errorPulse = useSharedValue(0);

  useEffect(() => {
    getJobDetail(id).then(setJob);
  }, [id]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!error) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    // A soft opacity pulse — no movement, closer to a Face ID failure than a shake.
    errorPulse.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 420 })
    );
  }, [error, errorPulse]);

  const errorPulseStyle = useAnimatedStyle(() => ({
    opacity: errorPulse.value * 0.14,
  }));

  async function handleVerify() {
    if (!job || otp.length < OTP_LENGTH) return;
    setSubmitting(true);
    setError(null);

    const previousTotal = (await getDriverStats()).cashCollectedTotal;
    const result = await confirmDeliveryWithOTP(id, otp, job.cashToCollect);
    setSubmitting(false);

    if (!result.success) {
      setError(t(result.error ?? 'common.genericError'));
      setOtp('');
      return;
    }

    router.push({
      pathname: '/job/[id]/cash-collected',
      params: {
        id,
        cashAmount: String(job.cashToCollect),
        previousTotal: String(previousTotal),
      },
    });
  }

  const handleResend = useCallback(() => {
    setOtp('');
    setError(null);
    setResendSeconds(RESEND_SECONDS);
  }, []);

  function handleKeyPress(key: string) {
    if (key === 'del') {
      setOtp((prev) => prev.slice(0, -1));
      setError(null);
      return;
    }
    if (key === 'sms') {
      if (resendSeconds > 0) return;
      handleResend();
      return;
    }
    setOtp((prev) => (prev.length < OTP_LENGTH ? prev + key : prev));
    setError(null);
  }

  const firstName = job?.customerName.split(' ')[0] ?? '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        {job && <Text style={[monoStyle(12), { color: colors.textTertiary }]}>{job.id}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{t('otp.title')}</Text>
        <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
          {t('otp.subtitle', { name: firstName })}
        </Text>

        <View style={styles.section}>
          <View style={styles.otpRowWrap}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.errorOverlay,
                { backgroundColor: colors.danger, pointerEvents: 'none' },
                errorPulseStyle,
              ]}
            />
            <View style={styles.otpRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const isNext = i === otp.length && otp.length < OTP_LENGTH;
                return (
                  <OtpBox key={i} digit={otp[i]} active={isNext} error={!!error} colors={colors} />
                );
              })}
            </View>
          </View>

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <View style={styles.resendRow}>
            {resendSeconds > 0 ? (
              <Text style={[monoLabelStyle(11, 0.04), { color: colors.textTertiary }]}>
                {t('otp.resendIn', { seconds: String(resendSeconds).padStart(2, '0') })}
              </Text>
            ) : (
              <Text
                onPress={handleResend}
                style={[monoLabelStyle(11, 0.04), { color: colors.accent }]}>
                {t('otp.resend')}
              </Text>
            )}
            <Text
              onPress={() => job && Linking.openURL(telUrl(job.customerPhone))}
              style={[monoLabelStyle(11, 0.06), { color: colors.accent }]}>
              {t('otp.call')}
            </Text>
          </View>
        </View>

        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key) => (
                <AnimatedPressable
                  key={key}
                  scaleTo={0.92}
                  disabled={key === 'sms' && resendSeconds > 0}
                  style={[styles.key, { backgroundColor: colors.bgElevated }]}
                  onPress={() => handleKeyPress(key)}>
                  {key === 'del' ? (
                    <Ionicons name="backspace-outline" size={20} color={colors.text} />
                  ) : key === 'sms' ? (
                    <Text
                      style={[
                        monoLabelStyle(11, 0.06),
                        { color: resendSeconds > 0 ? colors.textTertiary : colors.accent },
                      ]}>
                      SMS
                    </Text>
                  ) : (
                    <Text style={[monoStyle(24, 'medium'), { color: colors.text }]}>{key}</Text>
                  )}
                </AnimatedPressable>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('otp.verify')}
          height={56}
          loading={submitting}
          disabled={otp.length < OTP_LENGTH}
          onPress={handleVerify}
        />
        <Text
          onPress={() => router.push({ pathname: '/job/[id]/photo-proof', params: { id } })}
          style={[styles.photoLink, { color: colors.accent }]}>
          {t('otp.takePhotoInstead')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 30,
    letterSpacing: -0.02 * 30,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    paddingTop: Spacing.xxs,
    paddingBottom: Spacing.xxl,
  },
  section: {
    gap: Spacing.lg,
  },
  otpRowWrap: {
    position: 'relative',
  },
  errorOverlay: {
    borderRadius: Radii.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  otpBox: {
    width: 60,
    height: 72,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    ...monoStyle(30, 'medium'),
  },
  error: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  keypad: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: Radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  photoLink: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    textAlign: 'center',
  },
});
