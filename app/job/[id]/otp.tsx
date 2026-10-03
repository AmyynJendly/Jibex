import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { Icon } from '../../../components/Icon';
import { LoadError } from '../../../components/LoadError';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useToast } from '../../../components/Toast';
import { TrackingId } from '../../../components/TrackingId';
import { OTP_MODE } from '../../../constants/backend';
import { Fonts, Radii, Spacing, Typography, monoLabelStyle, monoStyle, useColors } from '../../../constants';
import { deliveryBlocker } from '../../../lib/deliveryGate';
import { cashDueFor, cashDueLine, otpItemId } from '../../../lib/otpRule';
import { OTP_LENGTH, countdown, otpScreenState } from '../../../lib/otpSession';
import { invalidateDeliveryData } from '../../../lib/query';
import { callCustomer } from '../../../lib/stopActions';
import { useLoadedJob } from '../../../lib/useLoadedJob';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import { useWrite } from '../../../lib/useWrite';
import { safely } from '../../../lib/writeResult';
import { confirmDelivery, getDriverStats } from '../../../services/api';
import { otpService, testBannerCode, type OtpStatus } from '../../../services/otp';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
] as const;

/**
 * The customer's delivery code, for a parcel with nothing of value to
 * collect (see `lib/otpRule`). Opening this screen sends the code; "Livré"
 * only becomes available once the right one was typed. There is no way to
 * deliver from here without it: the only other exit is the failure screen.
 *
 * The screen knows nothing about how a code is sent or checked: it talks to
 * `otpService` (services/otp), today a mock, later the real API.
 */
export default function OtpScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();
  const write = useWrite();
  const { id, exchangeCollected } = useLocalSearchParams<{ id: string; exchangeCollected?: string }>();
  const { job, setJob, failed, retry, retrying } = useLoadedJob(id);

  const [status, setStatus] = useState<OtpStatus | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // One check at a time: a code is never sent to be verified twice.
  const checking = useRef(false);
  const itemId = job ? otpItemId(job) : null;

  // The countdowns (resend, expiry) move once a second.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Opening the screen sends the code. Opening it again does not send another.
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    otpService
      .sendOtp(itemId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setStatus(result.status);
          setSendError(null);
        } else {
          setSendError(t(result.error));
        }
      })
      .catch(() => {
        if (!cancelled) setSendError(t('common.networkError'));
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, t]);

  const view = status ? otpScreenState(status, now) : null;
  const testCode = testBannerCode(OTP_MODE, status);

  async function verify(entered: string) {
    if (!itemId || checking.current) return;
    checking.current = true;
    const result = await otpService.verifyOtp(itemId, entered).catch(() => null);
    checking.current = false;
    if (!result) {
      setError(t('common.networkError'));
      setCode('');
      return;
    }
    if (result.status) setStatus(result.status);
    if (result.success) {
      setError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(t(result.error));
    setCode('');
  }

  function handleKey(key: string) {
    if (!view?.canType || checking.current) return;
    if (key === 'del') {
      setCode((previous) => previous.slice(0, -1));
      setError(null);
      return;
    }
    if (code.length >= OTP_LENGTH) return;
    const next = code + key;
    setCode(next);
    setError(null);
    if (next.length === OTP_LENGTH) verify(next);
  }

  async function handleResend() {
    if (!itemId || !view?.canResend) return;
    const result = await otpService.resendOtp(itemId).catch(() => null);
    if (!result) {
      showToast(t('common.networkError'));
      return;
    }
    if (result.status) setStatus(result.status);
    if (!result.success) {
      showToast(t(result.error));
      return;
    }
    setCode('');
    setError(null);
    setNow(Date.now());
    showToast(t('otp.resentToast'));
  }

  async function handleCall() {
    if (!job) return;
    setJob(await callCustomer(job));
  }

  /** Only reachable with a verified code. The same checks as any delivery still apply. */
  async function handleDelivered() {
    if (!job || !view?.verified) return;
    const blocker = deliveryBlocker({
      callAttempts: job.callAttempts,
      exchange: job.exchange,
      exchangeCollected: exchangeCollected === '1',
    });
    if (blocker) {
      showToast(t(blocker));
      return;
    }
    if (!requireOnline()) return;
    if (!write.begin()) return;
    const previousTotal = await getDriverStats()
      .then((stats) => stats.cashCollectedTotal)
      .catch(() => 0);
    const result = await safely(() => confirmDelivery(job.id, job.cashToCollect));
    write.end();
    if (!result.success) {
      write.fail(result, handleDelivered);
      return;
    }
    await invalidateDeliveryData();
    router.replace({
      pathname: '/job/[id]/cash-collected',
      params: { id: job.id, cashAmount: String(job.cashToCollect), previousTotal: String(previousTotal) },
    });
  }

  function goToFailure() {
    router.replace({ pathname: '/job/[id]/cant-deliver', params: { id } });
  }

  if (!job) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          {failed ? <LoadError onRetry={retry} retrying={retrying} /> : null}
        </ScrollView>
      </View>
    );
  }

  const firstName = job.customerName.split(' ')[0] ?? '';
  // No way forward: nothing was sent, or the last code is dead with no resend left.
  const deadEnd = !!sendError || (!!view && view.exhausted && !view.canType);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* The parcel's tracking number sits in Apple's bar, where the title goes. */}
      <Stack.Screen options={{ headerTitle: () => <TrackingId value={job.id} size="inline" /> }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{t('otp.title')}</Text>
        <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
          {t('otp.subtitle', { name: firstName })}
        </Text>

        {/* Mock only: the code, so the flow can be tested with no SMS. `testCode`
            is null in real mode, whatever the service answered. */}
        {testCode && (
          <View style={[styles.testBanner, { borderColor: colors.warning, backgroundColor: colors.warningSoft }]}>
            <Text style={[monoLabelStyle(11, 0.08), { color: colors.warning }]}>{t('otp.testBanner')}</Text>
            <Text style={[styles.testBannerBody, { color: colors.text }]}>
              {t('otp.testBannerBody', { code: testCode })}
            </Text>
          </View>
        )}

        {/* What is collected with this delivery: nothing, or the fee only. */}
        <Text style={[styles.cash, { color: colors.textSecondary }]}>{cashDueLine(t, cashDueFor(job))}</Text>

        <View style={styles.statusRow}>
          <Icon
            name={view?.verified ? 'checkmark-circle' : sendError ? 'alert-circle-outline' : 'paper-plane-outline'}
            size={16}
            color={view?.verified ? colors.success : sendError ? colors.danger : colors.textSecondary}
          />
          <Text
            style={[
              styles.statusText,
              { color: view?.verified ? colors.success : sendError ? colors.danger : colors.textSecondary },
            ]}>
            {sendError ?? (view?.verified ? t('otp.verified') : status ? t('otp.sent') : t('otp.sending'))}
          </Text>
        </View>

        <View style={styles.boxes}>
          {Array.from({ length: OTP_LENGTH }).map((_, index) => {
            const active = !!view?.canType && index === code.length;
            return (
              <View
                key={index}
                style={[
                  styles.box,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: view?.verified
                      ? colors.success
                      : active
                        ? error
                          ? colors.danger
                          : colors.accent
                        : colors.separator,
                    borderWidth: active || view?.verified ? 2 : 1,
                  },
                ]}>
                <Text style={[styles.digit, { color: code[index] ? colors.text : colors.textTertiary }]}>
                  {view?.verified ? '•' : (code[index] ?? '_')}
                </Text>
              </View>
            );
          })}
        </View>

        {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
        {!error && view && !view.verified && view.expired && (
          <Text style={[styles.error, { color: colors.danger }]}>{t('otp.errors.expired')}</Text>
        )}
        {view && view.canType && status && status.attemptsLeft < 5 && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('otp.attemptsLeft', { count: status.attemptsLeft })}
          </Text>
        )}

        {view && !view.verified && (
          <View style={styles.resendRow}>
            {view.canResend ? (
              <Text onPress={handleResend} style={[styles.link, { color: colors.accent }]}>
                {t('otp.resend')}
              </Text>
            ) : status && status.resendsLeft > 0 ? (
              <Text style={[styles.muted, { color: colors.textTertiary }]}>
                {t('otp.resendIn', { time: countdown(view.resendInSeconds) })}
              </Text>
            ) : (
              <Text style={[styles.muted, { color: colors.textTertiary }]}>{t('otp.errors.noResendsLeft')}</Text>
            )}
            <Text onPress={handleCall} style={[styles.link, { color: colors.accent }]}>
              {t('otp.call')}
            </Text>
          </View>
        )}
        {view && !view.verified && status && status.resendsLeft > 0 && (
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            {t('otp.resendsLeft', { count: status.resendsLeft })}
          </Text>
        )}

        {/* The 3 resends are used, or nothing could be sent: the only way on is a failure. */}
        {((view && view.exhausted) || sendError) && (
          <View style={[styles.exhausted, { borderColor: colors.danger }]}>
            <Text style={[styles.exhaustedTitle, { color: colors.text }]}>{t('otp.exhaustedTitle')}</Text>
            {!sendError && (
              <Text style={[styles.exhaustedBody, { color: colors.textSecondary }]}>{t('otp.exhaustedBody')}</Text>
            )}
            <AnimatedPressable
              scaleTo={0.97}
              accessibilityRole="button"
              style={[styles.failButton, { backgroundColor: colors.danger }]}
              onPress={goToFailure}>
              <Text style={styles.failButtonText}>{t('otp.markFailed')}</Text>
            </AnimatedPressable>
          </View>
        )}

        {view?.canType && (
          <View style={styles.keypad}>
            {KEYPAD_ROWS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) =>
                  key === '' ? (
                    <View key={keyIndex} style={styles.key} />
                  ) : (
                    <AnimatedPressable
                      key={keyIndex}
                      scaleTo={0.92}
                      accessibilityRole="button"
                      accessibilityLabel={key === 'del' ? t('otp.deleteDigit') : key}
                      style={[styles.key, { backgroundColor: colors.bgElevated }]}
                      onPress={() => handleKey(key)}>
                      {key === 'del' ? (
                        <Icon name="backspace-outline" size={20} color={colors.text} />
                      ) : (
                        <Text style={[monoStyle(24, 'medium'), { color: colors.text }]}>{key}</Text>
                      )}
                    </AnimatedPressable>
                  )
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {!deadEnd && (
        <View style={styles.footer}>
          <PrimaryButton
            label={t('otp.deliver')}
            height={56}
            loading={write.sending}
            loadingLabel={t('common.sending')}
            disabled={!view?.verified}
            onPress={handleDelivered}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 30,
    letterSpacing: -0.02 * 30,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    marginTop: -Spacing.sm,
  },
  testBanner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: 2,
  },
  testBannerBody: {
    ...monoStyle(16, 'medium'),
  },
  cash: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    flex: 1,
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 64,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    ...monoStyle(26, 'medium'),
  },
  error: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    minHeight: 36,
  },
  link: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    paddingVertical: Spacing.sm,
  },
  muted: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
  },
  exhausted: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  exhaustedTitle: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
  },
  exhaustedBody: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  failButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  failButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
    color: '#fff',
  },
  keypad: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  key: {
    flex: 1,
    height: 54,
    borderRadius: Radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
  },
});

// A crash while this screen draws shows a message and "Réessayer", not a white screen.
export { ErrorBoundary } from '../../../components/ScreenErrorBoundary';
