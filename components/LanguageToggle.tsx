import { MenuView } from '@expo/ui/community/menu';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { Fonts, Radii, Spacing, useColors } from '../constants';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n';
import { useLanguage } from '../lib/i18n/LanguageProvider';

/**
 * The language switch on the login screen (before any settings are
 * reachable).
 *
 * On phones it's a small pill naming the current language that opens the
 * system menu, with a checkmark on the active one. The web drop-in can't
 * open native menus, so there it stays a two-option pill switcher.
 */
export function LanguageToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  if (Platform.OS !== 'web') {
    return (
      <MenuView
        style={[styles.menuAnchor, style]}
        actions={SUPPORTED_LANGUAGES.map((code: SupportedLanguage) => ({
          id: code,
          title: t(`settings.languages.${code}`),
          state: language === code ? 'on' : 'off',
        }))}
        onPressAction={({ nativeEvent }) => setLanguage(nativeEvent.event as SupportedLanguage)}>
        <View
          pointerEvents="none"
          style={[styles.menuPill, { backgroundColor: colors.bgElevated, borderColor: colors.separator }]}>
          <Icon name="globe-outline" size={15} color={colors.accent} />
          <Text style={[styles.label, { color: colors.text }]}>
            {t(`settings.languages.${language}`)}
          </Text>
          <Icon name="chevron-down" size={13} color={colors.textTertiary} />
        </View>
      </MenuView>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bgElevated }, style]}>
      {SUPPORTED_LANGUAGES.map((code: SupportedLanguage) => {
        const active = language === code;
        return (
          <AnimatedPressable
            key={code}
            scaleTo={0.94}
            onPress={() => setLanguage(code)}
            style={[styles.option, active && { backgroundColor: colors.accent }]}>
            <Text style={[styles.label, { color: active ? colors.onAccent : colors.textSecondary }]}>
              {t(`settings.languages.${code}`)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menuAnchor: {
    alignSelf: 'center',
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wrapper: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: Radii.full,
    padding: 3,
    gap: 2,
  },
  option: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  label: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
});
