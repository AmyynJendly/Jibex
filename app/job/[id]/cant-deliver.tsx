import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../../components/Icon';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useToast } from '../../../components/Toast';
import { Fonts, Radii, Spacing, Typography, sectionLabelStyle, useColors } from '../../../constants';
import {
  COMMON_REASONS,
  FAILURE_REASON_GROUPS,
  SELECTABLE_REASONS,
  reasonNeedsNote,
  type FailureReasonInfo,
} from '../../../lib/failureReasons';
import { invalidateDeliveryData } from '../../../lib/query';
import { captureCurrentCoords } from '../../../lib/useLiveCoords';
import { useOnlineGuard } from '../../../lib/useOnlineGuard';
import { markDeliveryFailed } from '../../../services/api';
import type { DeliveryFailureReason } from '../../../types';

/** Case- and accent-insensitive, so "reporte" finds "reporté". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Why a stop couldn't be delivered — 19 reasons, picked one-handed.
 *
 * The six reasons drivers pick most sit at the top; the rest follow in small
 * labelled groups (couldn't reach the customer, the customer, the address,
 * the order, something else) so the eye can jump to the right block instead
 * of reading a flat list of nineteen. Typing in the search box collapses
 * everything into one filtered list. Confirm is pinned to the bottom, under
 * the thumb, and when "Other" is picked its required note appears right
 * there beside it, already focused.
 */
export default function CantDeliverScreen() {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation();
  const { showToast } = useToast();
  const requireOnline = useOnlineGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<DeliveryFailureReason | null>(null);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requiredNoteRef = useRef<TextInput>(null);

  const needsNote = reasonNeedsNote(reason);
  const canConfirm = !!reason && (!needsNote || note.trim().length > 0);
  const labelOf = (value: DeliveryFailureReason) => t(`enums.failureReason.${value}`);

  function pick(value: DeliveryFailureReason) {
    setReason(value);
    // "Other" can't go without a note: put the cursor straight in it.
    if (reasonNeedsNote(value)) setTimeout(() => requiredNoteRef.current?.focus(), 150);
  }

  async function handleConfirm() {
    if (!reason || submitting) return;
    if (needsNote && !note.trim()) {
      showToast(t('cantDeliver.noteRequired'));
      return;
    }
    if (!requireOnline()) return;
    setSubmitting(true);
    // Captured before the write so the fix actually belongs to this failure
    // record rather than to whatever screen the driver is on later. Never
    // lets the failure go unlogged over it though — a denied permission or a
    // fix that never resolves falls back to `null`, not a blocked submit.
    const location = await captureCurrentCoords().catch(() => null);
    const result = await markDeliveryFailed(id, reason, note.trim() || undefined, location ?? undefined);
    setSubmitting(false);

    if (result.success) {
      await invalidateDeliveryData();
      router.replace('/(tabs)/runsheets');
    } else {
      showToast(t(result.error ?? 'common.genericError'));
    }
  }

  const searching = normalize(query).length > 0;
  const matches = searching
    ? SELECTABLE_REASONS.filter((r) => normalize(labelOf(r.value)).includes(normalize(query)))
    : [];

  const sections: { key: string; title: string; reasons: readonly FailureReasonInfo[] }[] =
    searching
      ? [{ key: 'results', title: '', reasons: matches }]
      : [
          { key: 'common', title: t('enums.failureReasonGroup.common'), reasons: COMMON_REASONS },
          ...FAILURE_REASON_GROUPS.map((group) => ({
            key: group,
            title: t(`enums.failureReasonGroup.${group}`),
            reasons: SELECTABLE_REASONS.filter((r) => r.group === group && !r.common),
          })).filter((section) => section.reasons.length > 0),
        ];

  const renderRow = (option: FailureReasonInfo) => {
    const selected = reason === option.value;
    return (
      <AnimatedPressable
        key={option.value}
        scaleTo={0.98}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => pick(option.value)}
        style={[
          styles.reasonRow,
          {
            backgroundColor: colors.bgElevated,
            borderColor: selected ? colors.danger : 'transparent',
          },
        ]}>
        <View style={[styles.reasonIcon, { backgroundColor: colors.dangerSoft }]}>
          <Icon name={option.icon} size={15} color={colors.danger} />
        </View>
        <Text style={[Typography.body, styles.reasonLabel, { color: colors.text }]}>
          {labelOf(option.value)}
        </Text>
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? colors.danger : colors.separator,
              backgroundColor: selected ? colors.danger : 'transparent',
            },
          ]}>
          {selected && <Icon name="checkmark" size={12} color="#fff" />}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={[styles.title, { color: colors.text }]}>{t('cantDeliver.title')}</Text>
        <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
          {t('cantDeliver.subtitle')}
        </Text>

        <View
          style={[styles.search, { backgroundColor: colors.bgElevated, borderColor: colors.separator }]}>
          <Icon name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('cantDeliver.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardAppearance={scheme}
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searching && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={12}
              onPress={() => setQuery('')}>
              <Icon name="close-circle-outline" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            {!!section.title && (
              <Text style={[sectionLabelStyle, styles.sectionLabel, { color: colors.textTertiary }]}>
                {section.title}
              </Text>
            )}
            <View style={styles.reasonList}>{section.reasons.map(renderRow)}</View>
          </View>
        ))}

        {searching && matches.length === 0 && (
          <Text style={[Typography.subhead, styles.noMatch, { color: colors.textSecondary }]}>
            {t('cantDeliver.noMatch', { query: query.trim() })}
          </Text>
        )}

        {/* Optional for every other reason; "Other" gets its required note
            in the pinned footer instead, next to Confirm. */}
        {!needsNote && (
          <View style={styles.noteBlock}>
            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>
              {t('cantDeliver.noteLabel')}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('cantDeliver.notePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardAppearance={scheme}
              multiline
              style={[
                styles.noteInput,
                { backgroundColor: colors.bgElevated, borderColor: colors.separator, color: colors.text },
              ]}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, needsNote && { borderTopColor: colors.separator, ...styles.footerRaised }]}>
        {needsNote && (
          <View style={styles.noteBlock}>
            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>
              {t('cantDeliver.noteRequiredLabel')}
            </Text>
            <TextInput
              ref={requiredNoteRef}
              value={note}
              onChangeText={setNote}
              placeholder={t('cantDeliver.noteRequiredPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardAppearance={scheme}
              multiline
              style={[
                styles.noteInput,
                styles.noteInputCompact,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: note.trim() ? colors.separator : colors.danger,
                  color: colors.text,
                },
              ]}
            />
            {!note.trim() && (
              <Text style={[Typography.footnote, { color: colors.danger }]}>
                {t('cantDeliver.noteRequired')}
              </Text>
            )}
          </View>
        )}
        <PrimaryButton
          label={t('cantDeliver.confirm')}
          height={56}
          loading={submitting}
          disabled={!canConfirm}
          onPress={handleConfirm}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.archivoExtraBold,
    fontSize: 30,
    letterSpacing: -0.02 * 30,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    marginTop: -Spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.archivoMedium,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    paddingLeft: Spacing.xxs,
  },
  reasonList: {
    gap: Spacing.sm,
  },
  // Compact rows: nineteen of them still need to scan quickly, but each stays
  // well over the 44pt touch minimum.
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 54,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  reasonIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMatch: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  noteBlock: {
    gap: Spacing.xs,
  },
  noteLabel: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    paddingLeft: Spacing.xxs,
  },
  noteInput: {
    fontFamily: Fonts.archivoMedium,
    minHeight: 90,
    borderRadius: Radii.input,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  noteInputCompact: {
    minHeight: 64,
    maxHeight: 110,
    paddingVertical: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  footerRaised: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
