import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { PackageCube } from '../components/PackageCube';
import { PrimaryButton } from '../components/PrimaryButton';
import { Fonts, Spacing, Typography, useColors } from '../constants';
import { clearToken, getToken } from '../lib/token';

type Gate =
  /** Reading the stored session — nothing decided yet. */
  | { phase: 'checking' }
  /** No stored session: straight to the login form. */
  | { phase: 'signedOut' }
  /** Session found, waiting on Face ID / passcode. */
  | { phase: 'locked'; failed: boolean }
  | { phase: 'unlocked' };

/**
 * Startup gate.
 *
 * The app used to redirect to the login form unconditionally, so a driver
 * signed in every single morning even though their session was sitting in the
 * Keychain the whole time. Now the stored session decides where they land.
 *
 * A session that survives app restarts is also a session someone else can
 * walk into, and this screen shows cash totals and customer addresses — so
 * returning drivers unlock with Face ID (or the device passcode, which
 * `authenticateAsync` falls back to on its own). Devices with no biometrics
 * and no passcode enrolled can't be locked at all, so they go straight in
 * rather than being stranded behind a prompt that will never appear.
 */
export default function Index() {
  const colors = useColors();
  const { t } = useTranslation();
  const [gate, setGate] = useState<Gate>({ phase: 'checking' });

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('auth.gate.unlockPrompt'),
      cancelLabel: t('common.cancel'),
    }).catch(() => ({ success: false }) as const);

    setGate(result.success ? { phase: 'unlocked' } : { phase: 'locked', failed: true });
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken().catch(() => null);
      if (cancelled) return;

      if (!token) {
        setGate({ phase: 'signedOut' });
        return;
      }

      // Nothing to authenticate against — don't lock the driver out of their
      // own app on a device that can't prove who they are.
      const canLock =
        (await LocalAuthentication.hasHardwareAsync().catch(() => false)) &&
        (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      if (cancelled) return;

      if (!canLock) {
        setGate({ phase: 'unlocked' });
        return;
      }

      setGate({ phase: 'locked', failed: false });
      unlock();
    })();

    return () => {
      cancelled = true;
    };
  }, [unlock]);

  async function handleSignOut() {
    await clearToken();
    setGate({ phase: 'signedOut' });
    router.replace('/(auth)/login');
  }

  if (gate.phase === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (gate.phase === 'unlocked') return <Redirect href="/(tabs)/home" />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <PackageCube size={72} />
      <Text style={[Typography.title1, { color: colors.text }]}>Jibex</Text>

      {gate.phase === 'checking' ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : (
        <View style={styles.lockBlock}>
          <View style={styles.lockRow}>
            <Ionicons
              name={gate.failed ? 'lock-closed' : 'scan-outline'}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
              {gate.failed ? t('auth.gate.lockedBody') : t('auth.gate.unlockPrompt')}
            </Text>
          </View>

          {gate.failed && (
            <>
              <PrimaryButton label={t('auth.gate.unlock')} onPress={unlock} />
              <AnimatedPressable scaleTo={0.97} style={styles.signOut} onPress={handleSignOut}>
                <Text style={[styles.signOutText, { color: colors.textSecondary }]}>
                  {t('auth.gate.useAnotherAccount')}
                </Text>
              </AnimatedPressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.xxxl,
  },
  spinner: {
    marginTop: Spacing.lg,
  },
  lockBlock: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  signOutText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
  },
});
