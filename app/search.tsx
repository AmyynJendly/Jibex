import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { Spacing, Typography, useColors } from '../constants';
import { getJobDetail } from '../services/mock-api';

/** "TRK-" + 8 hex chars — only worth hitting the mock API once the query could plausibly be a complete id. */
const TRACKING_ID_LENGTH = 12;

/**
 * iOS gets Apple's own search bar, built into the navigation bar: it
 * focuses once the screen has finished sliding in (so the keyboard and the
 * push no longer fight), its keyboard always matches light/dark mode, and
 * Cancel works the way it does everywhere else on the phone. Android and
 * web keep the in-page field.
 */
const useNativeSearchBar = Platform.OS === 'ios';

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
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('search.headerTitle') }} />

      {useNativeSearchBar ? (
        <Stack.SearchBar
          placeholder={t('search.placeholder')}
          autoCapitalize="characters"
          autoFocus
          hideWhenScrolling={false}
          obscureBackground={false}
          tintColor={colors.accent}
          textColor={colors.text}
          onChangeText={(event) => handleChangeText(event.nativeEvent.text)}
          onSearchButtonPress={handleSubmit}
        />
      ) : (
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
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  statusText: {
    paddingLeft: Spacing.xxs,
  },
});
