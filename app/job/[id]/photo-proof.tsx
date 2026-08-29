import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useToast } from '../../../components/Toast';
import { GlassIconButton } from '../../../components/GlassIconButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { Fonts, Radii, Spacing, Typography, morphIn } from '../../../constants';
import { invalidateDeliveryData } from '../../../lib/query';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import { confirmDeliveryWithPhoto, getDriverStats, getJobDetail } from '../../../services/mock-api';
import type { Job } from '../../../types';

/** 44pt minimum target for the small text actions on this screen. */
const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

export default function PhotoProofScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [job, setJob] = useState<Job | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  /** A capture already in flight — a second shutter tap would race it. */
  const capturingRef = useRef(false);
  const mountedRef = useRef(true);
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();

  useEffect(() => {
    getJobDetail(id).then(setJob);
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  async function handleCapture() {
    // Showing the photo swaps CameraView out for the preview, so the camera
    // unmounts the moment a capture lands. A second tap — or backing out
    // mid-capture — leaves takePictureAsync rejecting with "Camera unmounted
    // during taking photo process", which used to surface as an uncaught
    // rejection. Guard the second tap, and treat the rest as a failed shot.
    if (capturingRef.current || photoUri) return;
    capturingRef.current = true;

    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
      if (!photo || !mountedRef.current) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhotoUri(photo.uri);
    } catch {
      if (mountedRef.current) showToast(t('photoProof.captureFailed'));
    } finally {
      capturingRef.current = false;
    }
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
    <View style={styles.screen}>
      <View style={styles.header}>
        <GlassIconButton
          forceDark
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#fff" />
        </GlassIconButton>
        <Text style={[Typography.headline, styles.title]}>{t('photoProof.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {photoUri ? (
        <Animated.View entering={morphIn()} style={styles.preview}>
          <Animated.Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : permission?.granted ? (
        <CameraView ref={cameraRef} style={styles.preview} facing="back" />
      ) : (
        <View style={styles.permissionBlock}>
          <Ionicons name="camera-outline" size={28} color="#fff" />
          <Text style={styles.permissionBody}>{t('photoProof.permissionBody')}</Text>
          <PrimaryButton
            label={t('photoProof.enableCamera')}
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {photoUri ? t('photoProof.hintConfirm') : t('photoProof.hintCapture')}
        </Text>
        {photoUri ? (
          <>
            <PrimaryButton
              label={t('photoProof.confirmDelivery')}
              height={56}
              loading={submitting}
              onPress={handleConfirm}
            />
            <AnimatedPressable
              scaleTo={0.94}
              hitSlop={HIT_SLOP}
              onPress={() => setPhotoUri(null)}>
              <Text style={styles.retake}>{t('photoProof.retake')}</Text>
            </AnimatedPressable>
          </>
        ) : (
          permission?.granted && (
            <AnimatedPressable
              // The capture handler fires its own Medium impact on success.
              haptic={false}
              scaleTo={0.9}
              style={styles.shutterOuter}
              onPress={handleCapture}>
              <View style={styles.shutterInner} />
            </AnimatedPressable>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0c' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  title: { color: '#fff' },
  headerSpacer: { width: 44 },
  preview: {
    flex: 1,
    marginHorizontal: Spacing.xxl,
    borderRadius: Radii.card,
    overflow: 'hidden',
    backgroundColor: '#1a1a1c',
  },
  permissionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  permissionBody: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  hint: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  retake: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 15,
    color: '#fff',
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
