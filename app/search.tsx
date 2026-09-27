import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { Icon, type IconName } from '../components/Icon';
import { MetaChip } from '../components/MetaChip';
import { TrackingId } from '../components/TrackingId';
import { Radii, Spacing, Typography, useColors } from '../constants';
import { goToTarget } from '../lib/goToTarget';
import { searchParcels, type SearchHit, type SearchSource } from '../lib/parcelSearch';
import {
  useActiveParcels,
  useHistoryParcels,
  usePickups,
  useReturns,
  useTransfers,
} from '../lib/query';

/**
 * iOS gets Apple's own search bar, built into the navigation bar: it
 * focuses once the screen has finished sliding in (so the keyboard and the
 * push no longer fight), its keyboard always matches light/dark mode, and
 * Cancel works the way it does everywhere else on the phone. Android and
 * web keep the in-page field.
 */
const useNativeSearchBar = Platform.OS === 'ios';

const SOURCE_ICON: Record<SearchSource, IconName> = {
  runsheet: 'clipboard-outline',
  history: 'time-outline',
  pickup: 'cube-outline',
  transfer: 'swap-horizontal-outline',
  return: 'arrow-undo-outline',
};

/**
 * Search the driver's own parcels, on the phone — no server lookup. It
 * looks through what the app has already loaded (runsheets and their
 * history, pickups, transfers, returns), by tracking number or customer
 * name, says where each match was found, and opens the screen that shows it.
 */
export default function SearchScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const active = useActiveParcels();
  const history = useHistoryParcels();
  const pickups = usePickups();
  const transfers = useTransfers();
  const returns = useReturns();
  const sources = [active, history, pickups, transfers, returns];
  const nothingLoadedYet = sources.every((q) => q.data === undefined) && sources.some((q) => q.isPending);
  const someFailed = sources.some((q) => q.isError && q.data === undefined);

  const trimmed = query.trim();
  const hits = useMemo(
    () =>
      searchParcels(trimmed, {
        active: active.data,
        history: history.data,
        pickups: pickups.data,
        transfers: transfers.data,
        returns: returns.data,
      }),
    [trimmed, active.data, history.data, pickups.data, transfers.data, returns.data]
  );

  function open(hit: SearchHit) {
    // Replace: Back from the parcel returns to wherever the search started.
    goToTarget(hit.target, { replace: true });
  }

  /** Enter (or the keyboard's Search key) opens the result when there's only one. */
  function handleSubmit() {
    if (hits.length === 1) open(hits[0]);
  }

  function sourceLabel(hit: SearchHit) {
    return t(`search.source.${hit.source}`);
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
          autoCapitalize="none"
          autoFocus
          hideWhenScrolling={false}
          obscureBackground={false}
          tintColor={colors.accent}
          textColor={colors.text}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onSearchButtonPress={handleSubmit}
        />
      ) : (
        <FormField
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />
      )}

      {trimmed.length === 0 ? (
        <EmptyState icon="search-outline" title={t('search.instructions')} subtitle={t('search.scope')} />
      ) : nothingLoadedYet ? (
        <Text style={[Typography.footnote, styles.statusText, { color: colors.textSecondary }]}>
          {t('search.loading')}
        </Text>
      ) : hits.length === 0 ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('search.notFoundTitle')}
          subtitle={
            someFailed
              ? `${t('search.notFoundSubtitle', { code: trimmed })} ${t('search.someNotLoaded')}`
              : t('search.notFoundSubtitle', { code: trimmed })
          }
        />
      ) : (
        <View style={styles.results}>
          {hits.map((hit) => (
            <AnimatedPressable
              key={hit.key}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${hit.trackingNumber}, ${hit.name ?? ''}, ${sourceLabel(hit)}`}
              accessibilityHint={t('search.a11yOpens')}
              style={[styles.row, { backgroundColor: colors.bgElevated }]}
              onPress={() => open(hit)}>
              <View style={styles.rowText}>
                <TrackingId value={hit.trackingNumber} size="inline" />
                {hit.name ? (
                  <Text style={[Typography.subhead, { color: colors.text }]} numberOfLines={1}>
                    {hit.name}
                  </Text>
                ) : null}
                <View style={styles.whereRow}>
                  <MetaChip icon={SOURCE_ICON[hit.source]} label={sourceLabel(hit)} tone="accent" />
                  {hit.context ? (
                    <Text style={[Typography.footnote, styles.context, { color: colors.textSecondary }]} numberOfLines={1}>
                      {hit.context}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
            </AnimatedPressable>
          ))}
        </View>
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
  results: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs,
  },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  context: {
    flex: 1,
  },
});
