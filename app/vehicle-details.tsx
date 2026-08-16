import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { Fonts, Radii, Spacing, Typography, useColors } from '../constants';
import { getVehicle, updateVehicle } from '../services/mock-api';
import type { VehicleType } from '../types';

const VEHICLE_TYPES: { value: VehicleType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'motorcycle', icon: 'bicycle-outline' },
  { value: 'car', icon: 'car-outline' },
  { value: 'van', icon: 'bus-outline' },
  { value: 'bicycle', icon: 'bicycle-outline' },
];

export default function VehicleDetailsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<VehicleType>('motorcycle');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVehicle().then((v) => {
      setType(v.type);
      setPlate(v.plate);
      setModel(v.model);
      setColor(v.color);
      setLoaded(true);
    });
  }, []);

  async function handleSave() {
    if (saving || !plate.trim()) return;
    setSaving(true);
    await updateVehicle({ type, plate: plate.trim(), model: model.trim(), color: color.trim() });
    setSaving(false);
    showToast(t('vehicleDetails.savedToast'));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('vehicleDetails.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!loaded ? (
          <View style={styles.skeletonGroup}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            <View style={styles.typeRow}>
              {VEHICLE_TYPES.map((option) => {
                const active = option.value === type;
                return (
                  <AnimatedPressable
                    key={option.value}
                    scaleTo={0.94}
                    onPress={() => setType(option.value)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? colors.accent : colors.bgElevated,
                        borderColor: active ? colors.accent : colors.separator,
                      },
                    ]}>
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={active ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: active ? '#fff' : colors.textSecondary },
                      ]}>
                      {t(`vehicleDetails.types.${option.value}`)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <FormField
              label={t('vehicleDetails.plateLabel')}
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
            />
            <FormField
              label={t('vehicleDetails.modelLabel')}
              value={model}
              onChangeText={setModel}
              autoCapitalize="words"
            />
            <FormField
              label={t('vehicleDetails.colorLabel')}
              value={color}
              onChangeText={setColor}
              autoCapitalize="words"
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('vehicleDetails.saveChanges')}
          height={54}
          loading={saving}
          disabled={!loaded}
          onPress={handleSave}
        />
      </View>
    </KeyboardAvoidingView>
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
    gap: Spacing.md,
  },
  skeletonGroup: {
    gap: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  typeChipText: {
    fontFamily: Fonts.archivoBold,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
  },
});
