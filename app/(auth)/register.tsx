import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FormField } from '../../components/FormField';
import { GlassIconButton } from '../../components/GlassIconButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Spacing, Typography, useColors } from '../../constants';
import { saveToken } from '../../lib/token';
import { register } from '../../services/mock-api';

export default function RegisterScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFieldsFilled =
    name.trim() && phone.trim() && email.trim() && vehiclePlate.trim() && password && confirmPassword;

  async function handleContinue() {
    if (loading || !allFieldsFilled) return;

    if (password !== confirmPassword) {
      setError(t('auth.register.errors.passwordMismatch'));
      return;
    }

    setError(null);
    setLoading(true);
    const result = await register({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      vehiclePlate: vehiclePlate.trim(),
      password,
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
          <GlassIconButton onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </GlassIconButton>
          <View style={styles.progressBlock}>
            <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
              {t('auth.register.stepLabel')}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent }]} />
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{t('auth.register.title')}</Text>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FormField
            label={t('auth.register.fullNameLabel')}
            placeholder={t('auth.register.fullNamePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />
          <FormField
            label={t('auth.register.phoneLabel')}
            placeholder={t('auth.register.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
          <FormField
            label={t('auth.register.emailLabel')}
            placeholder={t('auth.register.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormField
            label={t('auth.register.plateLabel')}
            placeholder={t('auth.register.platePlaceholder')}
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            autoCapitalize="characters"
          />
          <FormField
            label={t('auth.register.passwordLabel')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
          <FormField
            label={t('auth.register.retypePasswordLabel')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
          />

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
          <PrimaryButton
            label={t('auth.register.continue')}
            onPress={handleContinue}
            loading={loading}
            disabled={!allFieldsFilled}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    borderRadius: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.02 * 30,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.mlg,
    paddingBottom: Spacing.lg,
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
});
