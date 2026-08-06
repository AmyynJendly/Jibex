import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';

import { GlassIconButton } from '../components/GlassIconButton';
import { Radii, Spacing, Typography, getCardShadow, sectionLabelStyle, useColors } from '../constants';

export default function SettingsScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            Notifications
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="notifications-outline" size={15} color={colors.accent} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                New assignment alerts
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
            Appearance
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.purpleSoft }]}>
                <Ionicons name="contrast-outline" size={15} color={colors.purple} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>Theme</Text>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                Matches System
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
            About
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.separator }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
              </View>
              <Text style={[Typography.body, styles.rowLabel, { color: colors.text }]}>
                App Version
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
