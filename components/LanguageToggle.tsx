import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Fonts, Radii, Spacing, useColors } from '../constants';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n';
import { useLanguage } from '../lib/i18n/LanguageProvider';

/**
 * Compact EN/FR pill switcher — used on the login screen (before any
 * settings are reachable) and anywhere else the driver needs to flip
 * language without digging into a menu.
 */
export function LanguageToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

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
            <Text
              style={[
                styles.label,
                { color: active ? '#fff' : colors.textSecondary },
              ]}>
              {t(`settings.languages.${code}`)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
