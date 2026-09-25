import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InfoList } from '../components/InfoList';
import { SkeletonRow } from '../components/Skeleton';
import { Spacing, useColors } from '../constants';
import { getUser } from '../services/mock-api';
import type { User } from '../types';

/**
 * Read-only: the agency provisions and maintains driver records, so this
 * screen displays them. Corrections go through dispatch, not the app.
 */
export default function PersonalInfoScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: t('personalInfo.headerTitle') }} />

      {!user ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <InfoList
          notice={t('personalInfo.readOnlyNotice')}
          rows={[
            { label: t('personalInfo.fullNameLabel'), value: user.name },
            { label: t('personalInfo.usernameLabel'), value: user.username },
            { label: t('personalInfo.emailLabel'), value: user.email },
            { label: t('personalInfo.driverCodeLabel'), value: user.driverCode },
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
