import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Fonts, Spacing, exitUp, morphInDown, useColors } from '../constants';

/**
 * A persistent (not auto-dismissing, unlike Toast) banner shown whenever the
 * device has no network — the mock backend always "succeeds," so this is
 * purely a heads-up for the driver; nothing here queues/retries yet since
 * there's no real API to fail against until the real backend lands.
 */
export function OfflineBanner() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  // Undetermined on first read — don't flash the banner before we actually know.
  if (netInfo.isConnected !== false) return null;

  return (
    <Animated.View
      entering={morphInDown(0, 12)}
      exiting={exitUp()}
      style={[styles.banner, { top: insets.top, backgroundColor: colors.warning }]}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>{t('offlineBanner.message')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    zIndex: 998,
  },
  text: {
    fontFamily: Fonts.archivoBold,
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
});
