import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useToast } from '../components/Toast';
import { Fonts, Spacing, useColors } from '../constants';
import { passwordProblem } from '../lib/password';
import { safely, writeErrorText } from '../lib/writeResult';
import { changePassword } from '../services/api';

/**
 * "Changer le mot de passe", from Profil. Three fields, like the Android
 * app's sheet: the current password, the new one, and the new one again.
 * The checks run on the phone first; nothing is sent while they fail.
 */
export default function ChangePasswordScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = !!oldPassword && !!newPassword && !!confirmPassword;

  async function handleSubmit() {
    if (sending) return;
    const problem = passwordProblem({ oldPassword, newPassword, confirmPassword });
    if (problem) {
      setError(t(problem));
      return;
    }
    setError(null);
    setSending(true);
    const result = await safely(() => changePassword(oldPassword, newPassword, confirmPassword));
    setSending(false);
    if (!result.success) {
      // The fields stay as typed, and the reason is shown.
      setError(writeErrorText(t, result));
      return;
    }
    showToast(t('changePassword.done'));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: t('changePassword.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <FormField
          label={t('changePassword.oldPassword')}
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
        />
        <FormField
          label={t('changePassword.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
        />
        <FormField
          label={t('changePassword.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          onSubmitEditing={handleSubmit}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('changePassword.hint')}</Text>

        {error && (
          <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          label={t('changePassword.submit')}
          height={52}
          loading={sending}
          disabled={!filled}
          onPress={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  hint: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    marginTop: -Spacing.sm,
  },
  error: {
    borderRadius: 12,
    padding: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
