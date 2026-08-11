import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FormField } from '../components/FormField';
import { GlassIconButton } from '../components/GlassIconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { Spacing, Typography, useColors } from '../constants';
import { getPayoutInfo, updatePayoutInfo } from '../services/mock-api';

export default function BankInfoScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPayoutInfo().then((p) => {
      setBankName(p.bankName);
      setAccountHolder(p.accountHolder);
      setIban(p.iban);
      setLoaded(true);
    });
  }, []);

  async function handleSave() {
    if (saving || !bankName.trim() || !iban.trim()) return;
    setSaving(true);
    await updatePayoutInfo({
      bankName: bankName.trim(),
      accountHolder: accountHolder.trim(),
      iban: iban.trim(),
    });
    setSaving(false);
    showToast(t('bankInfo.savedToast'));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </GlassIconButton>
        <Text style={[Typography.headline, { color: colors.text }]}>{t('bankInfo.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!loaded ? (
          <View style={styles.skeletonGroup}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            <View style={[styles.noteRow, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} />
              <Text style={[styles.noteText, { color: colors.text }]}>{t('bankInfo.note')}</Text>
            </View>

            <FormField
              label={t('bankInfo.bankNameLabel')}
              value={bankName}
              onChangeText={setBankName}
              autoCapitalize="words"
            />
            <FormField
              label={t('bankInfo.accountHolderLabel')}
              value={accountHolder}
              onChangeText={setAccountHolder}
              autoCapitalize="words"
            />
            <FormField
              label={t('bankInfo.ibanLabel')}
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('bankInfo.saveChanges')}
          height={54}
          loading={saving}
          disabled={!loaded}
          onPress={handleSave}
        />
      </View>
    </KeyboardAvoidingView>
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
    gap: Spacing.md,
  },
  skeletonGroup: {
    gap: Spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 30,
    paddingTop: Spacing.md,
  },
});
