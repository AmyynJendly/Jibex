import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { PrimaryButton } from './PrimaryButton';
import { useToast } from './Toast';
import { Fonts, Radii, Spacing, Typography, useColors } from '../constants';
import { enumLabel } from '../lib/enumLabel';
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
 */
export function StatusUpdateSheet({ job, onClose, onDone }: StatusUpdateSheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<DeliveryFailureReason | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const result = await markDeliveryFailed(job.id, reason);
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
    <Modal visible={!!job} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdropWrap}>
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        {job && (
          <Animated.View
            entering={FadeInUp.duration(220).springify(260).dampingRatio(1)}
            style={[
              styles.sheet,
              { backgroundColor: colors.bgElevated, paddingBottom: insets.bottom + Spacing.lg },
            ]}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />
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
                  <Ionicons name="arrow-undo-outline" size={18} color={colors.accent} />
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
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.deliveredButtonText}>{t('statusUpdate.delivered')}</Text>
                </AnimatedPressable>
                {!canDeliver && (
                  <View style={styles.callHintRow}>
                    <Ionicons name="call-outline" size={14} color={colors.warning} />
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
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
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
