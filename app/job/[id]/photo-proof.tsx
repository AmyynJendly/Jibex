import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useToast } from '../../../components/Toast';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { Fonts, Radii, Spacing, morphIn, useColors } from '../../../constants';
import { useHapticsEnabled } from '../../../lib/haptics';
import { invalidateDeliveryData } from '../../../lib/query';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import { confirmDeliveryWithPhoto, getDriverStats, getJobDetail } from '../../../services/mock-api';
import type { Job } from '../../../types';

/** 44pt minimum target for the small text actions on this screen. */
const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

/**
 * Proof-of-delivery photo, taken with the phone's own camera.
 *
 * The system camera opens straight away — the same one the driver uses every
 * day, with its own shutter, flash, zoom and Retake / Use Photo step. This
 * screen then shows the shot with Confirm, and Retake opens the camera again.
 * Cancelling the camera before any photo exists goes back to the stop.
 *
 * The web can't open a camera without a tap, so there the screen waits for
 * the button instead of opening it on arrival.
 */
export default function PhotoProofScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const opened = useRef(false);
  const { showToast } = useToast();
  const { enabled: hapticsEnabled } = useHapticsEnabled();
  const requireOnline = useOnlineGuard();

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraBlocked(true);
      return;
    }
    setCameraBlocked(false);

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        cameraType: ImagePicker.CameraType.back,
      });
      if (result.canceled) {
        // Backed out of the camera with nothing taken: nothing to confirm.
        if (!photoUri) router.back();
        return;
      }
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhotoUri(result.assets[0].uri);
    } catch {
      showToast(t('photoProof.captureFailed'));
    }
  }

  useEffect(() => {
    getJobDetail(id).then(setJob);
  }, [id]);

  useEffect(() => {
    if (opened.current || Platform.OS === 'web') return;
    opened.current = true;
    takePhoto();
    // Opens once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnableCamera() {
    const permission = await ImagePicker.getCameraPermissionsAsync();
    // Once refused for good, only Settings can turn it back on.
    if (!permission.canAskAgain) {
      Linking.openSettings();
      return;
    }
    takePhoto();
  }

  async function handleConfirm() {
    if (!job || !photoUri || submitting) return;
    if (!requireOnline()) return;
    setSubmitting(true);

    const previousTotal = (await getDriverStats()).cashCollectedTotal;
    const result = await confirmDeliveryWithPhoto(id, photoUri, job.cashToCollect);
    setSubmitting(false);

    // Previously this screen ignored a rejected delivery entirely, so the
    // driver tapped Confirm and nothing at all happened — most often because
    // the call-before-delivery gate had turned it down, with nothing on
    // screen to say so.
    if (!result.success) {
      showToast(t(result.error ?? 'common.genericError'));
      return;
    }

    await invalidateDeliveryData();
    // Replace, not push: the delivery is done, so backing out of the receipt
    // should never land on the camera that took its proof.
    router.replace({
      pathname: '/job/[id]/cash-collected',
      params: {
        id,
        cashAmount: String(job.cashToCollect),
        previousTotal: String(previousTotal),
      },
    });
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* A solid bar here: the photo sits below it instead of scrolling under it. */}
      <Stack.Screen
        options={{
          title: t('photoProof.title'),
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.bg },
        }}
      />

      {photoUri ? (
        <Animated.View
          entering={morphIn()}
          style={[styles.preview, { backgroundColor: colors.bgElevated }]}>
          <Animated.Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : (
        <View style={styles.waiting}>
          <View style={[styles.cameraTile, { backgroundColor: colors.accentSoft }]}>
            <Icon name="camera-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {cameraBlocked ? t('photoProof.permissionBody') : t('photoProof.hintCapture')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {photoUri ? (
          <>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {t('photoProof.hintConfirm')}
            </Text>
            <PrimaryButton
              label={t('photoProof.confirmDelivery')}
              height={56}
              loading={submitting}
              onPress={handleConfirm}
              style={styles.fullWidth}
            />
            <AnimatedPressable scaleTo={0.94} hitSlop={HIT_SLOP} onPress={takePhoto}>
              <Text style={[styles.retake, { color: colors.accent }]}>{t('photoProof.retake')}</Text>
            </AnimatedPressable>
          </>
        ) : (
          <PrimaryButton
            label={cameraBlocked ? t('photoProof.enableCamera') : t('photoProof.openCamera')}
            height={56}
            onPress={cameraBlocked ? handleEnableCamera : takePhoto}
            style={styles.fullWidth}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  preview: {
    flex: 1,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.xxl,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  cameraTile: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  retake: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 15,
  },
});
