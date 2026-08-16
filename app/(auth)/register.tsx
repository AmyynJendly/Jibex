import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FormField } from '../../components/FormField';
import { GlassIconButton } from '../../components/GlassIconButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useToast } from '../../components/Toast';
import {
  Fonts,
  Radii,
  Spacing,
  Typography,
  getCardShadow,
  monoLabelStyle,
  useColors,
} from '../../constants';
import { saveToken } from '../../lib/token';
import { register } from '../../services/mock-api';
import type { VehicleType } from '../../types';

const TOTAL_STEPS = 3;

const VEHICLE_TYPES: { value: VehicleType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'motorcycle', icon: 'bicycle-outline' },
  { value: 'car', icon: 'car-outline' },
  { value: 'van', icon: 'bus-outline' },
];

export default function RegisterScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — account
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  // Step 2 — vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [plate, setPlate] = useState('');
  const [cin, setCin] = useState('');
  const [licenseAdded, setLicenseAdded] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const step1Valid = name.trim() && phone.trim() && pin.length >= 4 && pinConfirm.length >= 4;
  const step2Valid = plate.trim() && cin.trim() && agreed;

  function handleBack() {
    if (step === 1) {
      router.back();
      return;
    }
    setError(null);
    setStep((s) => s - 1);
  }

  function handleContinueStep1() {
    if (!step1Valid) return;
    if (pin !== pinConfirm) {
      setError(t('auth.register.errors.pinMismatch'));
      return;
    }
    if (pin.length !== 4) {
      setError(t('auth.register.errors.pinLength'));
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleContinueStep2() {
    if (!step2Valid) {
      if (!agreed) setError(t('auth.register.errors.agreementRequired'));
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    const result = await register({
      name: name.trim(),
      phone: phone.trim(),
      vehiclePlate: plate.trim(),
      password: pin,
    });
    setLoading(false);

    if (!result.success || !result.token) {
      setError(t(result.error ?? 'common.genericError'));
      return;
    }

    await saveToken(result.token);
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <GlassIconButton onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </GlassIconButton>
          <View style={styles.progressBlock}>
            <Text style={[monoLabelStyle(12, 0.06), { color: colors.textSecondary }]}>
              {t(`auth.register.step${step}.stepLabel`)}
            </Text>
            <View style={styles.progressTrack}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    {
                      backgroundColor:
                        i < step - 1 ? colors.info : i === step - 1 ? colors.warning : colors.separator,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[Typography.title1, { color: colors.text }]}>
            {t(`auth.register.step${step}.title`)}
          </Text>
          <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
            {t(`auth.register.step${step}.subtitle`)}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <FormField
                label={t('auth.register.step1.fullNameLabel')}
                placeholder={t('auth.register.step1.fullNamePlaceholder')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
              />
              <FormField
                label={t('auth.register.step1.phoneLabel')}
                placeholder={t('auth.register.step1.phonePlaceholder')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
              <FormField
                label={t('auth.register.step1.pinLabel')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!pinVisible}
                keyboardType="number-pad"
                maxLength={4}
                labelRight={
                  <Text
                    onPress={() => setPinVisible((v) => !v)}
                    style={[monoLabelStyle(11, 0.08), { color: colors.accent }]}>
                    {pinVisible ? t('auth.login.hide') : t('auth.login.reveal')}
                  </Text>
                }
              />
              <FormField
                label={t('auth.register.step1.pinConfirmLabel')}
                value={pinConfirm}
                onChangeText={setPinConfirm}
                secureTextEntry={!pinVisible}
                keyboardType="number-pad"
                maxLength={4}
              />
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.vehicleRow}>
                {VEHICLE_TYPES.map((option) => {
                  const active = option.value === vehicleType;
                  return (
                    <AnimatedPressable
                      key={option.value}
                      scaleTo={0.95}
                      onPress={() => setVehicleType(option.value)}
                      style={[
                        styles.vehicleCard,
                        {
                          backgroundColor: active ? colors.warning : colors.bgElevated,
                          borderColor: active ? colors.warning : colors.separator,
                        },
                      ]}>
                      <Ionicons
                        name={option.icon}
                        size={22}
                        color={active ? '#2E3439' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.vehicleCardLabel,
                          { color: active ? '#2E3439' : colors.textSecondary },
                        ]}>
                        {t(`auth.register.step2.vehicleTypes.${option.value === 'motorcycle' ? 'scooter' : option.value}`)}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <FormField
                label={t('auth.register.step2.plateLabel')}
                placeholder={t('auth.register.step2.platePlaceholder')}
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
              />
              <FormField
                label={t('auth.register.step2.cinLabel')}
                placeholder={t('auth.register.step2.cinPlaceholder')}
                value={cin}
                onChangeText={setCin}
                keyboardType="number-pad"
              />

              <AnimatedPressable
                scaleTo={0.98}
                style={[
                  styles.licenseRow,
                  { backgroundColor: colors.bgElevated },
                  getCardShadow(scheme),
                ]}
                onPress={() => setLicenseAdded((v) => !v)}>
                <View style={[styles.licenseIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="camera-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.licenseText}>
                  <Text style={[Typography.callout, { color: colors.text, fontFamily: Fonts.archivoBold }]}>
                    {t('auth.register.step2.licenseTitle')}
                  </Text>
                  <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                    {t('auth.register.step2.licenseSubtitle')}
                  </Text>
                </View>
                <Text style={[monoLabelStyle(12, 0.04), { color: licenseAdded ? colors.success : colors.accent }]}>
                  {licenseAdded ? t('auth.register.step2.added') : t('auth.register.step2.add')}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.98}
                style={styles.agreementRow}
                onPress={() => setAgreed((v) => !v)}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: agreed ? colors.accent : 'transparent',
                      borderColor: agreed ? colors.accent : colors.separator,
                    },
                  ]}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[Typography.footnote, styles.agreementText, { color: colors.textSecondary }]}>
                  {t('auth.register.step2.agreement')}
                </Text>
              </AnimatedPressable>
            </>
          )}

          {step === 3 && (
            <>
              <View>
                <Text style={[monoLabelStyle(11, 0.06), styles.sectionLabel, { color: colors.textTertiary }]}>
                  {t('auth.register.step3.sectionAccount')}
                </Text>
                <View style={[styles.reviewCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                  <ReviewRow label={t('auth.register.step1.fullNameLabel')} value={name} colors={colors} />
                  <ReviewRow label={t('auth.register.step1.phoneLabel')} value={phone} colors={colors} last />
                </View>
              </View>

              <View>
                <Text style={[monoLabelStyle(11, 0.06), styles.sectionLabel, { color: colors.textTertiary }]}>
                  {t('auth.register.step3.sectionVehicle')}
                </Text>
                <View style={[styles.reviewCard, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
                  <ReviewRow
                    label={t('auth.register.step2.vehicleTypeLabel')}
                    value={t(`auth.register.step2.vehicleTypes.${vehicleType === 'motorcycle' ? 'scooter' : vehicleType}`)}
                    colors={colors}
                  />
                  <ReviewRow label={t('auth.register.step2.plateLabel')} value={plate} colors={colors} />
                  <ReviewRow label={t('auth.register.step2.cinLabel')} value={cin} colors={colors} last />
                </View>
              </View>
            </>
          )}

          {error ? (
            <Text
              style={[
                Typography.footnote,
                styles.error,
                { color: colors.danger, backgroundColor: colors.dangerSoft },
              ]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step === 1 && (
            <PrimaryButton
              label={t('auth.register.continue')}
              onPress={handleContinueStep1}
              disabled={!step1Valid}
            />
          )}
          {step === 2 && (
            <PrimaryButton
              label={t('auth.register.continue')}
              onPress={handleContinueStep2}
              disabled={!step2Valid}
            />
          )}
          {step === 3 && (
            <PrimaryButton
              label={t('auth.register.step3.submit')}
              onPress={handleSubmit}
              loading={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  last?: boolean;
}

function ReviewRow({ label, value, colors, last }: ReviewRowProps) {
  return (
    <View
      style={[
        styles.reviewRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
      ]}>
      <Text style={[Typography.footnote, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[Typography.callout, { color: colors.text, fontFamily: Fonts.archivoBold }]}>
        {value || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressBlock: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  progressSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  titleBlock: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.mlg,
    paddingBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xxs,
  },
  form: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  error: {
    borderRadius: 16,
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.mlg,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: Spacing.smd,
    marginBottom: Spacing.xs,
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    paddingVertical: Spacing.lg,
  },
  vehicleCardLabel: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xl,
    padding: Spacing.md,
  },
  licenseIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  licenseText: {
    flex: 1,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.xxs,
    paddingTop: Spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  agreementText: {
    flex: 1,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    paddingLeft: 2,
    marginBottom: Spacing.sm,
  },
  reviewCard: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
