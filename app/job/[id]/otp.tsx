import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
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
import { useToast } from '../../../components/Toast';
import { Radii, Spacing, Typography, getCardShadow, useColors, type ColorPalette } from '../../../constants';
import { confirmDeliveryWithOTP, getDriverStats, getJobDetail } from '../../../services/mock-api';
import type { Job } from '../../../types';

const OTP_LENGTH = 4;

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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const errorPulse = useSharedValue(0);

  useEffect(() => {
    getJobDetail(id).then(setJob);
  }, [id]);

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
      inputRef.current?.focus();
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

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{t('otp.title')}</Text>
        <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
          {t('otp.subtitle')}
        </Text>

        <View style={styles.section}>
          {job && (
            <View
              style={[
                styles.customerCard,
                { backgroundColor: colors.bgElevated },
                getCardShadow(scheme),
              ]}>
              <View>
                <Text style={[Typography.cardTitle, { color: colors.text }]}>
                  {job.customerName}
                </Text>
                <Text style={[styles.customerAddress, { color: colors.textSecondary }]}>
                  {job.address}
                </Text>
              </View>
              <AnimatedPressable
                scaleTo={0.88}
                style={[styles.phoneButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => showToast(t('common.callToast'))}>
                <Ionicons name="call-outline" size={18} color={colors.accent} />
              </AnimatedPressable>
            </View>
          )}

          <View style={styles.otpRowWrap}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.errorOverlay,
                { backgroundColor: colors.danger, pointerEvents: 'none' },
                errorPulseStyle,
              ]}
            />
            <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const isNext = i === otp.length && otp.length < OTP_LENGTH;
                return (
                  <OtpBox key={i} digit={otp[i]} active={isNext} error={!!error} colors={colors} />
                );
              })}
            </Pressable>
          </View>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            style={styles.hiddenInput}
          />

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <Text
            onPress={() => {
              setOtp('');
              setError(null);
              inputRef.current?.focus();
            }}
            style={[styles.resend, { color: colors.accent }]}>
            {t('otp.resend')}
          </Text>
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
        <AnimatedPressable
          scaleTo={0.97}
          style={styles.unreachableRow}
          onPress={() => showToast(t('common.callToast'))}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.unreachableText, { color: colors.textSecondary }]}>
            {t('otp.unreachable')}
          </Text>
        </AnimatedPressable>
        <Text
          onPress={() => router.push({ pathname: '/job/[id]/photo-proof', params: { id } })}
          style={[styles.photoLink, { color: colors.accent }]}>
          {t('otp.takePhotoInstead')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.02 * 30,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    paddingTop: Spacing.xxs,
    paddingBottom: Spacing.xxl,
  },
  section: {
    gap: 22,
  },
  customerCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerAddress: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  phoneButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 30,
    fontWeight: '800',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -Spacing.md,
  },
  resend: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  unreachableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  unreachableText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoLink: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
