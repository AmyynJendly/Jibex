import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { Radii, Spacing, Typography, getCardShadow, sectionLabelStyle, useColors } from '../constants';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n';
import { useLanguage } from '../lib/i18n/LanguageProvider';

export default function SettingsScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('settings.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            {t('settings.sectionLanguage')}
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            {SUPPORTED_LANGUAGES.map((code: SupportedLanguage, i) => {
              const selected = language === code;
              return (
                <AnimatedPressable
                  key={code}
                  onPress={() => setLanguage(code)}
                  style={[
                    styles.row,
                    i < SUPPORTED_LANGUAGES.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.separator,
                    },
                  ]}>
                  <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                    {t(`settings.languages.${code}`)}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            {t('settings.sectionNotifications')}
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="notifications-outline" size={15} color={colors.accent} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                {t('settings.newAssignmentAlerts')}
              </Text>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ true: colors.accent }}
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            {t('settings.sectionAppearance')}
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.purpleSoft }]}>
                <Ionicons name="contrast-outline" size={15} color={colors.purple} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                {t('settings.theme')}
              </Text>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                {t('settings.themeMatchesSystem')}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            {t('settings.sectionAbout')}
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                {t('settings.appVersion')}
              </Text>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </View>
        </View>
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
    gap: Spacing.xl,
  },
  sectionLabel: {
    paddingLeft: 2,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
});
