import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GlassIconButton } from '../components/GlassIconButton';
import { ReadOnlyField } from '../components/ReadOnlyField';
import { SkeletonRow } from '../components/Skeleton';
import { Fonts, Spacing, Typography, useColors } from '../constants';
import { getUser, getVehicle } from '../services/mock-api';
import type { User, Vehicle } from '../types';

/**
 * Read-only: vehicle and driver records are maintained by the agency, so
 * this screen displays them. Changes go through dispatch, not the app.
 */
export default function VehicleDetailsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getVehicle().then(setVehicle);
    getUser().then(setUser);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>
          {t('vehicleDetails.headerTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!vehicle || !user ? (
          <View style={styles.skeletonGroup}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            <View style={[styles.notice, { backgroundColor: colors.bgElevated }]}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                {t('vehicleDetails.readOnlyNotice')}
              </Text>
            </View>
            <ReadOnlyField label={t('vehicleDetails.driverLabel')} value={user.name} />
            <ReadOnlyField label={t('vehicleDetails.driverCodeLabel')} value={user.driverCode} />
            <ReadOnlyField
              label={t('vehicleDetails.typeLabel')}
              value={t(`vehicleDetails.types.${vehicle.type}`)}
            />
            <ReadOnlyField label={t('vehicleDetails.plateLabel')} value={vehicle.plate} />
            <ReadOnlyField label={t('vehicleDetails.modelLabel')} value={vehicle.model} />
            <ReadOnlyField label={t('vehicleDetails.colorLabel')} value={vehicle.color} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: { width: 44 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  skeletonGroup: {
    gap: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
  },
});
