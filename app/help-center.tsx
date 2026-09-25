import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '../components/Icon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FaqList } from '../components/FaqList';
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

  const contactCard = (
    <AnimatedPressable
      scaleTo={0.98}
      onPress={() => Linking.openURL('mailto:support@jibex.app')}
      style={[styles.contactRow, { backgroundColor: colors.accent }]}>
      <View style={styles.contactIcon}>
        <Icon name="chatbubbles-outline" size={20} color="#fff" />
      </View>
      <View style={styles.contactText}>
        <Text style={styles.contactTitle}>{t('helpCenter.contactSupport')}</Text>
        <Text style={styles.contactSubtitle}>support@jibex.app</Text>
      </View>
      <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
    </AnimatedPressable>
  );

  // iOS: Apple's grouped list with native fold-out questions.
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: t('helpCenter.headerTitle') }} />
        <FaqList
          header={contactCard}
          sectionTitle={t('helpCenter.faqSectionLabel')}
          faqs={faqs}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: t('helpCenter.headerTitle') }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {contactCard}

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
                  <Icon
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
