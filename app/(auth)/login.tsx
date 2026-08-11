import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AmbientGlow } from '../../components/AmbientGlow';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FormField } from '../../components/FormField';
import { GlassSurface } from '../../components/GlassSurface';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useToast } from '../../components/Toast';
import { Radii, Spacing, Typography, getAccentGlow, useColors } from '../../constants';
import { saveToken } from '../../lib/token';
import { login } from '../../services/mock-api';

export default function LoginScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;

    setError(null);
    setLoading(true);
    const result = await login(phone.trim(), password);
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
                <AmbientGlow width={220} height={220} />
              </View>
              <Animated.View
                entering={ZoomIn.springify(320).dampingRatio(1)}
                style={[styles.logo, { backgroundColor: colors.accent }, getAccentGlow(0.35)]}>
                <Ionicons name="cube-outline" size={30} color="#fff" />
              </Animated.View>
            </View>
            <Text style={[Typography.title1, { color: colors.text, marginTop: Spacing.xs }]}>
              Jibex
            </Text>
            <Text style={[Typography.callout, { color: colors.textSecondary }]}>
              {t('auth.login.tagline')}
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              label={t('auth.login.phoneLabel')}
              placeholder={t('auth.login.phonePlaceholder')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            <FormField
              label={t('auth.login.passwordLabel')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
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

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
              <Text style={[Typography.caption1, { color: colors.textTertiary }]}>
                {t('auth.login.or')}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
            </View>

            <View style={styles.socialRow}>
              <AnimatedPressable
                scaleTo={0.92}
                style={styles.socialButton}
                onPress={() => showToast(t('auth.login.appleToast'))}>
                <GlassSurface style={styles.socialFill}>
                  <Ionicons name="logo-apple" size={27} color={colors.text} />
                </GlassSurface>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.92}
                style={styles.socialButton}
                onPress={() => showToast(t('auth.login.googleToast'))}>
                <GlassSurface style={styles.socialFill}>
                  <Ionicons name="logo-google" size={24} color={colors.text} />
                </GlassSurface>
              </AnimatedPressable>
            </View>
          </View>

          <Link href="/(auth)/register" style={styles.footer}>
            <Text style={[Typography.callout, { color: colors.textSecondary }]}>
              {t('auth.login.newDriver')}
              <Text style={{ color: colors.accent, fontWeight: '700' }}>
                {t('auth.login.createAccount')}
              </Text>
            </Text>
          </Link>
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
  logo: {
    width: 64,
    height: 64,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  socialButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
  },
  socialFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
});
