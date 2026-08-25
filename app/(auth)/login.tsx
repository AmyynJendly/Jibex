import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AmbientGlow } from '../../components/AmbientGlow';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FormField } from '../../components/FormField';
import { LanguageToggle } from '../../components/LanguageToggle';
import { PackageCube } from '../../components/PackageCube';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TickerMarquee } from '../../components/TickerMarquee';
import { Fonts, Radii, Spacing, Typography, monoLabelStyle, useColors } from '../../constants';
import { DISPATCH_PHONE, telUrl } from '../../lib/phone';
import { saveToken } from '../../lib/token';
import { login } from '../../services/mock-api';

export default function LoginScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;

    setError(null);
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (!result.success || !result.token) {
      setError(t(result.error ?? 'common.genericError'));
      return;
    }

    await saveToken(result.token);
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoStage}>
              <View style={styles.glowLayer}>
                <AmbientGlow width={220} height={220} color={colors.warning} />
              </View>
              <Animated.View entering={ZoomIn.springify(320).dampingRatio(1)}>
                <PackageCube size={88} />
              </Animated.View>
            </View>
            <Text style={[Typography.title1, { color: colors.text, marginTop: Spacing.xs }]}>
              Jibex
            </Text>
            <Text style={[monoLabelStyle(12, 0.12), styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.login.subtitle')}
            </Text>
          </View>

          <LanguageToggle style={styles.languageToggle} />

          <View style={styles.form}>
            <FormField
              label={t('auth.login.usernameLabel')}
              placeholder={t('auth.login.usernamePlaceholder')}
              value={username}
              onChangeText={setUsername}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
            <FormField
              label={t('auth.login.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              textContentType="password"
              inputAccessory={
                <AnimatedPressable
                  scaleTo={0.88}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible ? t('auth.login.hide') : t('auth.login.reveal')
                  }
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisible((v) => !v)}>
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={passwordVisible ? colors.accent : colors.textTertiary}
                  />
                </AnimatedPressable>
              }
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

            <PrimaryButton
              label={t('auth.login.logIn')}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <AnimatedPressable
              scaleTo={0.97}
              style={styles.forgotPinRow}
              onPress={() => Linking.openURL(telUrl(DISPATCH_PHONE))}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.forgotPin, { color: colors.textSecondary }]}>
                {t('auth.login.forgotPassword')}
              </Text>
            </AnimatedPressable>
          </View>

          {/* No self-signup: agencies provision driver accounts, so there's
              deliberately no route from here to the register screen. */}
          <TickerMarquee
            items={t('auth.login.ticker', { returnObjects: true, phone: DISPATCH_PHONE }) as string[]}
            style={styles.ticker}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.smd,
    paddingBottom: Spacing.xxl,
  },
  logoStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -Spacing.xl,
  },
  glowLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  form: {
    gap: Spacing.mlg,
  },
  error: {
    borderRadius: Radii.input,
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: Spacing.smd,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  forgotPin: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
  subtitle: {
    marginTop: -2,
  },
  languageToggle: {
    marginBottom: Spacing.xl,
  },
  ticker: {
    marginTop: Spacing.xxl,
    marginHorizontal: -Spacing.xxxl,
  },
});
