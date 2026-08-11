import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { GlassSurface } from '../components/GlassSurface';
import { PrimaryButton } from '../components/PrimaryButton';
import { useToast } from '../components/Toast';
import { Radii, Spacing, Typography } from '../constants';
import { confirmScan } from '../services/mock-api';

/**
 * Scanner is always dark, regardless of system theme — it's a camera
 * viewfinder overlay, matching the design (screen 06) which never themes it.
 * The corner brackets and scan line are opaque accent-colored accents (not
 * glass) — only the icon buttons and the bottom hint pill are glass, per the
 * design.
 *
 * Uses a plain `View` + hardcoded `paddingTop: 58` for the header, matching
 * every other custom-header screen — NOT `SafeAreaView`. This is the one
 * screen presented as `fullScreenModal` (see app/_layout.tsx), and
 * `react-native-safe-area-context` insets are unreliable inside a native
 * modal presentation on iOS (a known react-native-screens gotcha), which was
 * pushing the header up past the notch and making the top buttons unreachable.
 */
/** Sweep range within the 250pt frame, clear of the 44pt corner brackets. */
const SWEEP_RANGE = 95;

const BARCODE_TYPES = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a'] as const;

export default function ScannerScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scanLockedRef = useRef(false);
  const sweep = useSharedValue(-SWEEP_RANGE);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(SWEEP_RANGE, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [sweep]);

  useEffect(() => {
    // Calling this when permission is already granted just resolves immediately —
    // safe to fire unconditionally on mount rather than waiting on the async
    // initial `permission` read (which starts `null` and would otherwise miss
    // the "not yet asked" case on the very first render).
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value }],
  }));

  async function handleCode(code: string) {
    if (scanLockedRef.current) return;
    scanLockedRef.current = true;
    setSubmitting(true);

    const result = await confirmScan(code);
    setSubmitting(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('scanner.confirmedToast', { label: result.label }));
      setTimeout(() => router.back(), 700);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(t(result.error ?? 'scanner.errors.notRecognized'));
      setTimeout(() => {
        scanLockedRef.current = false;
      }, 1200);
    }
  }

  function handleBarcodeScanned(scanningResult: BarcodeScanningResult) {
    handleCode(scanningResult.data);
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    handleCode(manualCode.trim());
    setManualCode('');
    setManualEntry(false);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      <View style={styles.header}>
        <GlassIconButton forceDark onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#fff" />
        </GlassIconButton>
        <Text style={[Typography.headline, styles.title]}>{t('scanner.title')}</Text>
        <GlassIconButton forceDark onPress={() => setTorchOn((v) => !v)}>
          <Ionicons
            name={torchOn ? 'flashlight' : 'flashlight-outline'}
            size={20}
            color="#fff"
          />
        </GlassIconButton>
      </View>

      {!permission?.granted ? (
        <View style={styles.permissionBlock}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.permissionTitle}>{t('scanner.permissionTitle')}</Text>
          <Text style={styles.permissionBody}>{t('scanner.permissionBody')}</Text>
          <PrimaryButton
            label={t('scanner.enableCamera')}
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      ) : (
        <View style={styles.viewfinder}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {manualEntry ? (
          <View style={styles.manualEntryRow}>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder={t('scanner.manualPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="characters"
              autoFocus
              style={styles.manualInput}
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
            <AnimatedPressable
              scaleTo={0.92}
              style={styles.manualSubmit}
              onPress={handleManualSubmit}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </AnimatedPressable>
          </View>
        ) : (
          <GlassSurface tint="dark" colorScheme="dark" style={styles.hintPill}>
            <Text style={[Typography.callout, styles.hintText]}>
              {submitting ? t('scanner.hintChecking') : t('scanner.hintAlign')}
            </Text>
          </GlassSurface>
        )}
        <Text onPress={() => setManualEntry((v) => !v)} style={[Typography.headline, styles.manual]}>
          {manualEntry ? t('scanner.useCamera') : t('scanner.enterManually')}
        </Text>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  title: {
    color: '#fff',
  },
  permissionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
  },
  permissionBody: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
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
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  manualInput: {
    flex: 1,
    height: 52,
    borderRadius: Radii.input,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.lg,
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  manualSubmit: {
    width: 52,
    height: 52,
    borderRadius: Radii.input,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
