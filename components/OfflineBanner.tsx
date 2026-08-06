import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, useColors } from '../constants';

/**
 * A persistent (not auto-dismissing, unlike Toast) banner shown whenever the
 * device has no network — the mock backend always "succeeds," so this is
 * purely a heads-up for the driver; nothing here queues/retries yet since
 * there's no real API to fail against until the real backend lands.
 */
export function OfflineBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  // Undetermined on first read — don't flash the banner before we actually know.
  if (netInfo.isConnected !== false) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify().dampingRatio(1)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.banner, { top: insets.top, backgroundColor: colors.warning }]}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>You&apos;re offline — changes will sync when reconnected</Text>
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
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
