import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassIconButton } from '../components/GlassIconButton';
import { GlassSurface } from '../components/GlassSurface';
import { Radii, Spacing, Typography } from '../constants';

/**
 * Scanner is always dark, regardless of system theme — it's a camera
 * viewfinder overlay, matching the design (screen 06) which never themes it.
 * The corner brackets and scan line are opaque accent-colored accents (not
 * glass) — only the icon buttons and the bottom hint pill are glass, per the
 * design.
 */
export default function ScannerScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <GlassIconButton forceDark onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#fff" />
        </GlassIconButton>
        <Text style={[Typography.headline, styles.title]}>Scan Package</Text>
        <GlassIconButton forceDark onPress={() => {}}>
          <Ionicons name="flashlight-outline" size={20} color="#fff" />
        </GlassIconButton>
      </View>

      <View style={styles.viewfinder}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <View style={styles.scanLine} />
        </View>
      </View>

      <View style={styles.footer}>
        <GlassSurface tint="dark" colorScheme="dark" style={styles.hintPill}>
          <Text style={[Typography.callout, styles.hintText]}>
            Align barcode within frame to confirm pickup
          </Text>
        </GlassSurface>
        <Text
          onPress={() => {}}
          style={[Typography.headline, styles.manual]}>
          Enter Code Manually
        </Text>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = '#0A5FFF';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  title: {
    color: '#fff',
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 250,
    height: 250,
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: ACCENT,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: Radii.xl,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: Radii.xl,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: Radii.xl,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: Radii.xl,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 2,
    backgroundColor: ACCENT,
    opacity: 0.85,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  footer: {
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: 44,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  hintPill: {
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    overflow: 'hidden',
  },
  hintText: {
    color: '#fff',
    textAlign: 'center',
  },
  manual: {
    color: ACCENT,
  },
});
