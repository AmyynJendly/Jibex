import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { Fonts, Radii, Spacing, Typography } from '../constants';
import { attachReturnPhoto } from '../services/mock-api';

/** Captures and attaches a damage-documentation photo to a return — same camera pattern as photo-proof.tsx. */
export default function ReturnPhotoScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCapture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
    if (photo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhotoUri(photo.uri);
    }
  }

  async function handleConfirm() {
    if (!photoUri || submitting) return;
    setSubmitting(true);
    await attachReturnPhoto(id, photoUri);
    setSubmitting(false);
    router.back();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <GlassIconButton forceDark onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#fff" />
        </GlassIconButton>
        <Text style={[Typography.headline, styles.title]}>{t('returnPhoto.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {photoUri ? (
        <Animated.View entering={ZoomIn.springify(240).dampingRatio(1)} style={styles.preview}>
          <Animated.Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : permission?.granted ? (
        <CameraView ref={cameraRef} style={styles.preview} facing="back" />
      ) : (
        <View style={styles.permissionBlock}>
          <Ionicons name="camera-outline" size={28} color="#fff" />
          <Text style={styles.permissionBody}>{t('returnPhoto.permissionBody')}</Text>
          <PrimaryButton
            label={t('returnPhoto.enableCamera')}
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {photoUri ? t('returnPhoto.hintConfirm') : t('returnPhoto.hintCapture')}
        </Text>
        {photoUri ? (
          <>
            <PrimaryButton
              label={t('returnPhoto.attach')}
              height={56}
              loading={submitting}
              onPress={handleConfirm}
            />
            <Text onPress={() => setPhotoUri(null)} style={styles.retake}>
              {t('returnPhoto.retake')}
            </Text>
          </>
        ) : (
          permission?.granted && (
            <AnimatedPressable scaleTo={0.9} style={styles.shutterOuter} onPress={handleCapture}>
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
