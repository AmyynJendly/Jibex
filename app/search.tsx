import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { GlassIconButton } from '../components/GlassIconButton';
import { Spacing, Typography, useColors } from '../constants';
import { getJobDetail } from '../services/mock-api';

/** "TRK-" + 8 hex chars — only worth hitting the mock API once the query could plausibly be a complete id. */
const TRACKING_ID_LENGTH = 12;

type SearchStatus = 'idle' | 'searching' | 'not-found';

export default function SearchScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const requestIdRef = useRef(0);

  async function runSearch(code: string) {
    const requestId = ++requestIdRef.current;
    setStatus('searching');

    try {
      const job = await getJobDetail(code);
      if (requestIdRef.current !== requestId) return;
      router.replace(`/job/${job.id}`);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setStatus('not-found');
    }
  }

  function handleChangeText(text: string) {
    setQuery(text);
    const trimmed = text.trim().toUpperCase();
    if (trimmed.length < TRACKING_ID_LENGTH) {
      // Drops any lookup still in flight for a longer string the driver
      // has since deleted back from.
      requestIdRef.current++;
      setStatus('idle');
      return;
    }
    runSearch(trimmed);
  }

  function handleSubmit() {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    runSearch(trimmed);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <GlassIconButton accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </GlassIconButton>
          <Text style={[Typography.headline, { color: colors.text }]}>{t('search.headerTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <FormField
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            value={query}
            onChangeText={handleChangeText}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />

          {status === 'searching' && (
            <Text style={[Typography.footnote, styles.statusText, { color: colors.textSecondary }]}>
              {t('search.searching')}
            </Text>
          )}

          {status === 'not-found' && (
            <EmptyState
              icon="alert-circle-outline"
              title={t('search.notFoundTitle')}
              subtitle={t('search.notFoundSubtitle', { code: query.trim().toUpperCase() })}
            />
          )}

          {status === 'idle' && query.trim().length === 0 && (
            <EmptyState icon="search-outline" title={t('search.instructions')} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxs,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  statusText: {
    paddingLeft: Spacing.xxs,
  },
});
