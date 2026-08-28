import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Fonts, Radii, Spacing, Typography, monoStyle } from '../constants';
import { invalidateDeliveryData, invalidateReturns, invalidateTransfers } from '../lib/query';
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
  const { batchIds: batchIdsParam } = useLocalSearchParams<{ batchIds?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const scanLockedRef = useRef(false);
  const sweep = useSharedValue(-SWEEP_RANGE);

  // "Tout scanner" on the Returns screen passes the pending returns' ids
  // here so this same generic scanner can track progress through that
  // specific batch — a single-item "Scanner" tap never sets this param.
  const batchIds = useMemo(() => {
    if (!batchIdsParam) return null;
    try {
      const parsed = JSON.parse(batchIdsParam);
      return Array.isArray(parsed) && parsed.length > 0 ? (parsed as string[]) : null;
    } catch {
      return null;
    }
  }, [batchIdsParam]);
  const isBatchMode = !!batchIds;
  const batchTotal = batchIds?.length ?? 0;
  const [remainingBatchIds, setRemainingBatchIds] = useState<string[]>(batchIds ?? []);
  const batchComplete = isBatchMode && remainingBatchIds.length === 0;
  const batchScannedCount = batchTotal - remainingBatchIds.length;

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
      // A scan can close out a transfer, a return batch or a parcel — the
      // screens holding any of those are elsewhere in the stack.
      await Promise.all([invalidateTransfers(), invalidateReturns(), invalidateDeliveryData()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const toastKey =
        result.kind === 'transfer' ? 'scanner.transferConfirmedToast' : 'scanner.confirmedToast';
      showToast(t(toastKey, { label: result.label }));
      setScannedCount((c) => c + 1);
      if (result.kind === 'return' && result.id) {
        setRemainingBatchIds((prev) => prev.filter((id) => id !== result.id));
      }
      setTimeout(() => {
        scanLockedRef.current = false;
      }, 900);
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
      {permission?.granted && !batchComplete && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      <View style={styles.header}>
        <GlassIconButton
          forceDark
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#fff" />
        </GlassIconButton>
        <Text style={[Typography.headline, styles.title]}>
          {t(isBatchMode ? 'scanner.batchTitle' : 'scanner.title')}
        </Text>
        <GlassIconButton
          forceDark
          accessibilityLabel={t('scanner.a11yTorch')}
          onPress={() => setTorchOn((v) => !v)}>
          <Ionicons
            name={torchOn ? 'flashlight' : 'flashlight-outline'}
            size={20}
            color="#fff"
          />
        </GlassIconButton>
      </View>

      {isBatchMode && !batchComplete && (
        <View style={styles.batchProgressRow}>
          <Text style={styles.batchProgressText}>
            {t('scanner.batchProgress', { done: batchScannedCount, total: batchTotal })}
          </Text>
        </View>
      )}

      {batchComplete ? (
        <View style={styles.batchCompleteBlock}>
          <View style={styles.batchCompleteIcon}>
            <Ionicons name="checkmark" size={32} color="#2E3439" />
          </View>
          <Text style={styles.permissionTitle}>{t('scanner.batchCompleteTitle')}</Text>
          <Text style={styles.permissionBody}>{t('scanner.batchCompleteBody')}</Text>
          <PrimaryButton
            label={t('scanner.batchDoneButton')}
            onPress={() => router.back()}
            style={styles.permissionButton}
          />
        </View>
      ) : !permission?.granted ? (
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

      {!batchComplete && (
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
          <GlassSurface tint="dark" colorScheme="dark" style={styles.hintCard}>
            <View style={styles.hintIcon}>
              <Ionicons name="scan-outline" size={18} color={ACCENT} />
            </View>
            <View style={styles.hintTextStack}>
              <Text style={styles.hintTitle}>
                {submitting ? t('scanner.hintChecking') : t('scanner.hintTitle')}
              </Text>
              {!submitting && <Text style={styles.hintSubtitle}>{t('scanner.hintSubtitle')}</Text>}
            </View>
          </GlassSurface>
        )}

        <View style={styles.actionRow}>
          <AnimatedPressable
            scaleTo={0.95}
            style={[styles.actionButton, styles.actionButtonDark]}
            onPress={() => setManualEntry((v) => !v)}>
            <Text style={styles.actionButtonTextLight}>
              {manualEntry ? t('scanner.title') : t('scanner.enterCode')}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.95}
            style={[styles.actionButton, styles.actionButtonAccent]}
            onPress={() => setManualEntry(false)}>
            <Text style={styles.actionButtonTextDark}>{t('scanner.burstScan')}</Text>
          </AnimatedPressable>
        </View>

        {!isBatchMode && scannedCount > 0 && (
          <Text style={styles.scannedCount}>
            {t('scanner.scannedCount', { count: scannedCount })}
          </Text>
        )}
      </View>
      )}
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#EAB464';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#2E3439',
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
    fontFamily: Fonts.archivoBold,
    fontSize: 19,
    color: '#fff',
  },
  permissionBody: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  batchProgressRow: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  batchProgressText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
    color: ACCENT,
  },
  batchCompleteBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  batchCompleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
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
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    alignSelf: 'stretch',
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    overflow: 'hidden',
  },
  hintIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  hintTextStack: {
    flex: 1,
  },
  hintTitle: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
    color: '#fff',
  },
  hintSubtitle: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.smd,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionButtonAccent: {
    backgroundColor: ACCENT,
  },
  actionButtonTextLight: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
    color: '#fff',
  },
  actionButtonTextDark: {
    fontFamily: Fonts.archivoBold,
    fontSize: 14,
    color: '#2E3439',
  },
  scannedCount: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  manualInput: {
    ...monoStyle(17, 'medium'),
    flex: 1,
    height: 52,
    borderRadius: Radii.input,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.lg,
    color: '#fff',
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
