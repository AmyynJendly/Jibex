import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PrimaryButton } from './PrimaryButton';
import { Radii, Spacing, Typography, useColors } from '../constants';

interface LoadErrorProps {
  onRetry: () => void;
  retrying?: boolean;
}

/**
 * What a screen shows when its data didn't arrive.
 *
 * Every screen used to sit on skeletons forever in this case — no message, no
 * way out, which is what made a dropped connection feel like the app had
 * frozen. The wording stays deliberately non-technical: the driver can't act
 * on a status code, only on "try again".
 */
export function LoadError({ onRetry, retrying = false }: LoadErrorProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated }]}>
      <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      </View>
      <Text style={[Typography.title3, styles.title, { color: colors.text }]}>
        {t('common.loadError.title')}
      </Text>
      <Text style={[Typography.footnote, styles.body, { color: colors.textSecondary }]}>
        {t('common.loadError.body')}
      </Text>
      <PrimaryButton
        label={t('common.loadError.retry')}
        height={46}
        loading={retrying}
        onPress={onRetry}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radii.card,
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  button: {
    alignSelf: 'stretch',
  },
});
