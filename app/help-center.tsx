import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassIconButton } from '../components/GlassIconButton';
import { Radii, Spacing, Typography, getCardShadow, useColors } from '../constants';

const FAQS = [
  {
    question: 'When do I get paid?',
    answer:
      'Cash you collect on delivery is yours to hand off at shift end — see Shift Summary. Your weekly base pay and bonuses are deposited to the bank account on file every Friday.',
  },
  {
    question: 'What if a customer refuses a package?',
    answer:
      'Open the stop, tap "Can\'t Deliver", and choose "Customer refused delivery". Dispatch is notified automatically and the item is flagged for return.',
  },
  {
    question: 'How does route order work?',
    answer:
      'Runsheets are automatically ordered by shortest total driving distance from your depot, recalculated every time you complete or fail a stop — you don\'t need to plan the order yourself.',
  },
  {
    question: 'My scanner won\'t read a barcode',
    answer:
      'Make sure camera access is enabled and the barcode is well-lit. If it still won\'t scan, use "Enter Code Manually" on the scanner screen instead.',
  },
  {
    question: 'How do I change which days I work?',
    answer: 'Go to Profile → Availability and mark the dates and time blocks you\'re free.',
  },
];

export default function HelpCenterScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>Help Center</Text>
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
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSubtitle}>support@jibex.app</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </AnimatedPressable>

        <Text style={[Typography.footnote, styles.sectionLabel, { color: colors.textTertiary }]}>
          FREQUENTLY ASKED
        </Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, i) => {
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
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  contactSubtitle: {
    fontSize: 13,
    fontWeight: '500',
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
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  faqAnswer: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
});
