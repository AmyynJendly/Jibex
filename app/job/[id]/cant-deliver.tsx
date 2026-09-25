import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useToast } from '../../../components/Toast';
import { Fonts, Radii, Spacing, Typography, useColors } from '../../../constants';
import { invalidateDeliveryData } from '../../../lib/query';
import { captureCurrentCoords } from '../../../lib/useLiveCoords';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import { markDeliveryFailed } from '../../../services/mock-api';
import type { DeliveryFailureReason } from '../../../types';

/** The real 7 failure reasons — icon per reason, label resolved from `enums.failureReason` (Part A/B). */
const REASONS: { value: DeliveryFailureReason; icon: IconName }[] = [
  { value: 'CUSTOMER_ABSENT', icon: 'home-outline' },
  { value: 'REFUSED', icon: 'close-circle-outline' },
  { value: 'INCORRECT_ADDRESS', icon: 'location-outline' },
  { value: 'INCOMPLETE_ADDRESS', icon: 'map-outline' },
  { value: 'PHONE_UNREACHABLE', icon: 'call-outline' },
  { value: 'NO_ANSWER', icon: 'volume-mute-outline' },
  { value: 'OTHER', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function CantDeliverScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation();
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<DeliveryFailureReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason || submitting) return;
    if (!requireOnline()) return;
    setSubmitting(true);
    // Captured before the write so the fix actually belongs to this failure
    // record rather than to whatever screen the driver is on later. Never
    // lets the failure go unlogged over it though — a denied permission or a
    // fix that never resolves falls back to `null`, not a blocked submit.
    const location = await captureCurrentCoords().catch(() => null);
    const result = await markDeliveryFailed(id, reason, note.trim() || undefined, location ?? undefined);
    setSubmitting(false);

    if (result.success) {
      await invalidateDeliveryData();
      router.replace('/(tabs)/runsheets');
    } else {
      showToast(t(result.error ?? 'common.genericError'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{t('cantDeliver.title')}</Text>
        <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
          {t('cantDeliver.subtitle')}
        </Text>

        <View style={styles.reasonList}>
          {REASONS.map((option, i) => {
            const selected = reason === option.value;
            return (
              <View
                key={option.value}>
                <AnimatedPressable
                  onPress={() => setReason(option.value)}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: selected ? colors.danger : 'transparent',
                    },
                  ]}>
                  <View style={[styles.reasonIcon, { backgroundColor: colors.dangerSoft }]}>
                    <Icon name={option.icon} size={16} color={colors.danger} />
                  </View>
                  <Text style={[Typography.body, styles.reasonLabel, { color: colors.text }]}>
                    {t(`enums.failureReason.${option.value}`)}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.danger : colors.separator,
                        backgroundColor: selected ? colors.danger : 'transparent',
                      },
                    ]}>
                    {selected && <Icon name="checkmark" size={12} color="#fff" />}
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>

        <View style={styles.noteBlock}>
          <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>
            {t('cantDeliver.noteLabel')}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('cantDeliver.notePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardAppearance={scheme}
            multiline
            style={[
              styles.noteInput,
              { backgroundColor: colors.bgElevated, borderColor: colors.separator, color: colors.text },
            ]}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('cantDeliver.confirm')}
          height={56}
          loading={submitting}
          disabled={!reason}
          onPress={handleConfirm}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xxl,
  },
  title: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 30,
    letterSpacing: -0.02 * 30,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    marginTop: -Spacing.lg,
  },
  reasonList: {
    gap: Spacing.smd,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    borderWidth: 1.5,
    padding: Spacing.lg,
  },
  reasonIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBlock: {
    gap: Spacing.xs,
  },
  noteLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    paddingLeft: Spacing.xxs,
  },
  noteInput: {
    fontFamily: Fonts.archivoMedium,
    minHeight: 90,
    borderRadius: Radii.input,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
  },
});
