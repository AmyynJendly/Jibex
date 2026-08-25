import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GlassIconButton } from '../components/GlassIconButton';
import { ReadOnlyField } from '../components/ReadOnlyField';
import { SkeletonRow } from '../components/Skeleton';
import { Fonts, Spacing, Typography, useColors } from '../constants';
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
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>
          {t('personalInfo.headerTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!user ? (
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
                {t('personalInfo.readOnlyNotice')}
              </Text>
            </View>
            <ReadOnlyField label={t('personalInfo.fullNameLabel')} value={user.name} />
            <ReadOnlyField label={t('personalInfo.usernameLabel')} value={user.username} />
            <ReadOnlyField label={t('personalInfo.emailLabel')} value={user.email} />
            <ReadOnlyField label={t('personalInfo.driverCodeLabel')} value={user.driverCode} />
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
