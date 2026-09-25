import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InfoList } from '../components/InfoList';
import { SkeletonRow } from '../components/Skeleton';
import { Spacing, useColors } from '../constants';
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
      <Stack.Screen options={{ title: t('vehicleDetails.headerTitle') }} />

      {!vehicle || !user ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <InfoList
          notice={t('vehicleDetails.readOnlyNotice')}
          rows={[
            { label: t('vehicleDetails.driverLabel'), value: user.name },
            { label: t('vehicleDetails.driverCodeLabel'), value: user.driverCode },
            {
              label: t('vehicleDetails.typeLabel'),
              value: t(`vehicleDetails.types.${vehicle.type}`),
            },
            { label: t('vehicleDetails.plateLabel'), value: vehicle.plate },
            { label: t('vehicleDetails.modelLabel'), value: vehicle.model },
            { label: t('vehicleDetails.colorLabel'), value: vehicle.color },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
});
