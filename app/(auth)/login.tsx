import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';

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
      setError(result.error ?? 'Something went wrong. Please try again.');
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
            <Animated.View
              entering={ZoomIn.springify(320).dampingRatio(1)}
              style={[styles.logo, { backgroundColor: colors.accent }, getAccentGlow(0.35)]}>
              <Ionicons name="cube-outline" size={30} color="#fff" />
            </Animated.View>
            <Text style={[Typography.title1, { color: colors.text, marginTop: Spacing.xs }]}>
              Jibex
            </Text>
            <Text style={[Typography.callout, { color: colors.textSecondary }]}>
              Deliver more. Stress less.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              label="Phone Number"
              placeholder="+216 XX XXX XXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            <FormField
              label="Password"
              placeholder="••••••••••"
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
              label="Log In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
              <Text style={[Typography.caption1, { color: colors.textTertiary }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
            </View>

            <View style={styles.socialRow}>
              <AnimatedPressable
                scaleTo={0.92}
                style={styles.socialButton}
                onPress={() => showToast('Sign in with Apple — coming soon')}>
                <GlassSurface style={styles.socialFill}>
                  <Ionicons name="logo-apple" size={27} color={colors.text} />
                </GlassSurface>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.92}
                style={styles.socialButton}
                onPress={() => showToast('Sign in with Google — coming soon')}>
                <GlassSurface style={styles.socialFill}>
                  <Ionicons name="logo-google" size={24} color={colors.text} />
                </GlassSurface>
              </AnimatedPressable>
            </View>
          </View>

          <Link href="/(auth)/register" style={styles.footer}>
            <Text style={[Typography.callout, { color: colors.textSecondary }]}>
              New driver?{' '}
              <Text style={{ color: colors.accent, fontWeight: '700' }}>Create account</Text>
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
