import { router, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { Fonts, Spacing, Typography, useColors } from '../constants';
import { logError } from '../lib/errorLog';

/**
 * What a driver sees when a screen breaks: a short message and a way on —
 * never a white screen.
 *
 * Every route re-exports this as its `ErrorBoundary` (Expo Router's own
 * hook for it), so an error thrown while one screen draws is caught for that
 * screen alone: the tab bar and the other screens keep working. The error is
 * saved on the phone (`lib/errorLog`), since nothing else records it.
 *
 * "Réessayer" draws the screen again. If it breaks again, "Retour à
 * l'accueil" leaves it.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    logError(error, pathname);
  }, [error, pathname]);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.icon, { backgroundColor: colors.warningSoft }]}>
        <Icon name="alert-circle-outline" size={30} color={colors.warning} />
      </View>
      <Text style={[Typography.title3, styles.title, { color: colors.text }]}>{t('common.screenError.title')}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('common.screenError.body')}</Text>
      <PrimaryButton
        label={t('common.loadError.retry')}
        height={50}
        loading={retrying}
        onPress={handleRetry}
        style={styles.retry}
      />
      <AnimatedPressable
        scaleTo={0.97}
        accessibilityRole="button"
        style={styles.home}
        onPress={() => router.replace('/(tabs)/home')}>
        <Text style={[styles.homeText, { color: colors.textSecondary }]}>{t('common.screenError.home')}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  retry: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
  },
  home: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
