import { BottomSheet, RNHostView } from '@expo/ui';
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from './Icon';
import { AnimatedPressable } from './AnimatedPressable';
import { PrimaryButton } from './PrimaryButton';
import { useToast } from './Toast';
import { Fonts, Radii, Spacing, Typography, useColors } from '../constants';
import { enumLabel } from '../lib/enumLabel';
import { captureCurrentCoords } from '../lib/useLiveCoords';
import { markDeliveryFailed, reopenParcel } from '../services/mock-api';
import type { DeliveryFailureReason, Job } from '../types';

/** The real 7 failure reasons — same list as the full-screen Can't Deliver flow. */
const REASONS: DeliveryFailureReason[] = [
  'CUSTOMER_ABSENT',
  'REFUSED',
  'INCORRECT_ADDRESS',
  'INCOMPLETE_ADDRESS',
  'PHONE_UNREACHABLE',
  'NO_ANSWER',
  'OTHER',
];

interface StatusUpdateSheetProps {
  /** The sheet is visible whenever this is non-null. */
  job: Job | null;
  onClose: () => void;
  /** Called after any status change lands — the parent refreshes its lists. */
  onDone: () => void;
}

/**
 * Bottom sheet for updating a parcel's status. "Delivered" routes into the
 * existing OTP → Cash Collected flow rather than marking delivered itself —
 * OTP verification stays the one way a delivery gets confirmed — and is
 * gated on the driver having called the customer at least once.
 *
 * For a parcel that's already resolved, the sheet turns into a correction
 * tool instead, so a wrongly-marked package can always be put back.
 *
 * The sheet itself is the platform's (a SwiftUI sheet on iOS) — its drag,
 * dimming and dismissal are native; only the content is ours.
 *
 * On a phone it opens exactly as tall as its content. The content sits in
 * `RNHostView` (how React Native views are hosted in SwiftUI) and is measured,
 * and that height becomes the sheet's only detent. Left to size itself, the
 * sheet can't see into React Native content — it opened full height and laid
 * the content out wrongly.
 */
const PADDING = { top: Spacing.lg, bottom: Spacing.lg, left: Spacing.xxl, right: Spacing.xxl };
/** Used only until the content has been measured once. */
const ESTIMATED_CONTENT_HEIGHT = 440;
const isNative = Platform.OS !== 'web';

export function StatusUpdateSheet({ job: requestedJob, onClose, onDone }: StatusUpdateSheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [reason, setReason] = useState<DeliveryFailureReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // A native sheet keeps sliding down after it's told to close. Holding on
  // to the last parcel keeps its content on screen for that slide instead
  // of the sheet emptying out on the way down.
  const [lastJob, setLastJob] = useState(requestedJob);
  if (requestedJob && requestedJob !== lastJob) setLastJob(requestedJob);
  const job = requestedJob ?? lastJob;

  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(ESTIMATED_CONTENT_HEIGHT);
  const sheetHeight = contentHeight + PADDING.top + PADDING.bottom + insets.bottom;

  function handleContentLayout(event: LayoutChangeEvent) {
    const measured = Math.ceil(event.nativeEvent.layout.height);
    if (measured > 0 && measured !== contentHeight) setContentHeight(measured);
  }

  const hosted = (content: ReactElement) =>
    isNative ? <RNHostView>{content}</RNHostView> : content;

  const isResolved = job?.status === 'DELIVERED' || job?.status === 'FAILED';
  const canDeliver = (job?.callAttempts ?? 0) > 0;

  function handleClose() {
    setReason(null);
    onClose();
  }

  function handleDelivered() {
    if (!job) return;
    if (!canDeliver) {
      showToast(t('statusUpdate.callRequired'));
      return;
    }
    const id = job.id;
    handleClose();
    router.push({ pathname: '/job/[id]/otp', params: { id } });
  }

  async function handleConfirmFailed() {
    if (!job || !reason || submitting) return;
    setSubmitting(true);
    // Same capture as the full-screen Can't Deliver flow — this sheet is the
    // other place a failure reason gets set, so it needs the same proof.
    const location = await captureCurrentCoords().catch(() => null);
    const result = await markDeliveryFailed(job.id, reason, undefined, location ?? undefined);
    setSubmitting(false);
    setReason(null);
    if (!result.success) {
      showToast(t(result.error ?? 'common.genericError'));
      return;
    }
    showToast(t('statusUpdate.failedToast'));
    onDone();
  }

  async function handleReopen() {
    if (!job || submitting) return;
    setSubmitting(true);
    await reopenParcel(job.id);
    setSubmitting(false);
    setReason(null);
    showToast(t('statusUpdate.reopenedToast'));
    onDone();
  }

  return (
    <BottomSheet
      isPresented={!!requestedJob}
      onDismiss={handleClose}
      containerColor={colors.bgElevated}
      contentPadding={PADDING}
      snapPoints={isNative ? [{ height: sheetHeight }] : undefined}>
      {job &&
        hosted(
          <View style={styles.sheet} onLayout={handleContentLayout}>
            <Text style={[Typography.title3, { color: colors.text }]}>{t('statusUpdate.title')}</Text>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
              {job.id} · {job.customerName}
            </Text>

            {isResolved ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  {t('statusUpdate.correctSection')}
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={[styles.reopenButton, { borderColor: colors.accent }]}
                  onPress={handleReopen}>
                  <Icon name="arrow-undo-outline" size={18} color={colors.accent} />
                  <Text style={[styles.reopenButtonText, { color: colors.accent }]}>
                    {t('statusUpdate.markPending')}
                  </Text>
                </AnimatedPressable>
              </>
            ) : (
              <>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={[
                    styles.deliveredButton,
                    { backgroundColor: colors.success, opacity: canDeliver ? 1 : 0.45 },
                  ]}
                  onPress={handleDelivered}>
                  <Icon name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.deliveredButtonText}>{t('statusUpdate.delivered')}</Text>
                </AnimatedPressable>
                {!canDeliver && (
                  <View style={styles.callHintRow}>
                    <Icon name="call-outline" size={14} color={colors.warning} />
                    <Text style={[styles.callHintText, { color: colors.warning }]}>
                      {t('statusUpdate.callHint')}
                    </Text>
                  </View>
                )}

                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  {t('statusUpdate.failedSection')}
                </Text>
                <View style={styles.chipRow}>
                  {REASONS.map((value) => {
                    const selected = reason === value;
                    return (
                      <AnimatedPressable
                        key={value}
                        scaleTo={0.95}
                        onPress={() => setReason(value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.danger : colors.dangerSoft,
                            borderColor: selected ? colors.danger : 'transparent',
                          },
                        ]}>
                        <Text style={[styles.chipText, { color: selected ? '#fff' : colors.danger }]}>
                          {enumLabel(t, 'failureReason', value)}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                <PrimaryButton
                  label={t('statusUpdate.confirmFailed')}
                  height={52}
                  disabled={!reason}
                  loading={submitting}
                  onPress={handleConfirmFailed}
                  style={styles.confirmFailedButton}
                />
              </>
            )}
          </View>
        )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: Spacing.md,
  },
  deliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    borderRadius: 27,
    marginTop: Spacing.xs,
  },
  deliveredButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
    color: '#fff',
  },
  callHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  callHintText: {
    flex: 1,
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
  },
  reopenButtonText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.04 * 12,
    marginTop: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  confirmFailedButton: {
    marginTop: Spacing.sm,
  },
});
