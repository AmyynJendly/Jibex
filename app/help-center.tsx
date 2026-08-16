import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { Fonts, Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';

interface Faq {
  question: string;
  answer: string;
}

export default function HelpCenterScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = t('helpCenter.faqs', { returnObjects: true }) as Faq[];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('helpCenter.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedPressable
          scaleTo={0.98}
          onPress={() => Linking.openURL('mailto:support@jibex.app')}
          style={[styles.contactRow, { backgroundColor: colors.accent }]}>
          <View style={styles.contactIcon}>
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>{t('helpCenter.contactSupport')}</Text>
            <Text style={styles.contactSubtitle}>support@jibex.app</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </AnimatedPressable>

        <Text style={[Typography.footnote, styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('helpCenter.faqSectionLabel').toUpperCase()}
        </Text>

        <View style={styles.faqList}>
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <AnimatedPressable
                key={faq.question}
                onPress={() => setOpenIndex(open ? null : i)}
                style={[
                  styles.faqCard,
                  { backgroundColor: colors.bgElevated },
                  getCardShadow(scheme),
                ]}>
                <View style={styles.faqQuestionRow}>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </View>
                {open && (
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                    {faq.answer}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
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
    gap: Spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontFamily: Fonts.archivoBold,
    fontSize: 15,
    color: '#fff',
  },
  contactSubtitle: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  sectionLabel: {
    letterSpacing: 0.04 * 13,
    paddingLeft: 2,
  },
  faqList: {
    gap: Spacing.smd,
  },
  faqCard: {
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  faqQuestion: {
    fontFamily: Fonts.archivoBold,
    flex: 1,
    fontSize: 14,
  },
  faqAnswer: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    lineHeight: 19,
  },
});
