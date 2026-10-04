import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { Icon, type IconName } from '../components/Icon';
import { MetaChip } from '../components/MetaChip';
import { TrackingId } from '../components/TrackingId';
import { useToast } from '../components/Toast';
import { Radii, Spacing, Typography, monoLabelStyle, useColors } from '../constants';
import * as device from '../lib/deviceStore';
import { goToTarget } from '../lib/goToTarget';
import { findExact, searchParcels, type SearchHit, type SearchSource } from '../lib/parcelSearch';
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
 * push don't fight), its keyboard always matches light/dark mode, and
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
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  // Parcels opened from here before, newest first — read fresh whenever
  // the driver comes back to Search.
  const [recent, setRecent] = useState<readonly device.RecentSearch[]>([]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      device.hydrateDeviceStore().then(() => {
        if (!cancelled) setRecent(device.recentSearches());
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const active = useActiveParcels();
  const history = useHistoryParcels();
  const pickups = usePickups();
  const transfers = useTransfers();
  const returns = useReturns();
  const sources = [active, history, pickups, transfers, returns];
  const nothingLoadedYet = sources.every((q) => q.data === undefined) && sources.some((q) => q.isPending);
  const someFailed = sources.some((q) => q.isError && q.data === undefined);

  const trimmed = query.trim();
  const loaded = useMemo(
    () => ({
      active: active.data,
      history: history.data,
      pickups: pickups.data,
      transfers: transfers.data,
      returns: returns.data,
    }),
    [active.data, history.data, pickups.data, transfers.data, returns.data]
  );
  const hits = useMemo(() => searchParcels(trimmed, loaded), [trimmed, loaded]);

  function open(hit: SearchHit) {
    // Remembered, so it's here next time Search opens.
    device.addRecentSearch({ trackingNumber: hit.trackingNumber, name: hit.name });
    // Replace: Back from the parcel returns to wherever the search started.
    goToTarget(hit.target, { replace: true });
  }

  /** A recent parcel opens where it is now — it may have moved to history since. */
  function openRecent(item: device.RecentSearch) {
    const [hit] = findExact(item.trackingNumber, loaded);
    if (hit) open(hit);
    else showToast(t('search.recentGone', { code: item.trackingNumber }));
  }

  async function removeRecent(trackingNumber: string) {
    await device.removeRecentSearch(trackingNumber);
    setRecent(device.recentSearches());
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

      {trimmed.length === 0 && recent.length > 0 ? (
        <View style={styles.results}>
          <Text style={[monoLabelStyle(11, 0.06), styles.recentLabel, { color: colors.textTertiary }]}>
            {t('search.recentTitle')}
          </Text>
          {recent.map((item) => (
            <View key={item.trackingNumber} style={[styles.row, { backgroundColor: colors.bgElevated }]}>
              <AnimatedPressable
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${item.trackingNumber}, ${item.name ?? ''}`}
                accessibilityHint={t('search.a11yOpens')}
                style={styles.recentOpen}
                onPress={() => openRecent(item)}>
                <Icon name="time-outline" size={16} color={colors.textTertiary} />
                <View style={styles.rowText}>
                  <TrackingId value={item.trackingNumber} size="inline" />
                  {item.name ? (
                    <Text style={[Typography.subhead, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  ) : null}
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.85}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('search.removeRecent', { code: item.trackingNumber })}
                onPress={() => removeRecent(item.trackingNumber)}>
                <Icon name="close-circle" size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          ))}
        </View>
      ) : trimmed.length === 0 ? (
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
  recentLabel: {
    textTransform: 'uppercase',
    paddingLeft: Spacing.xxs,
  },
  // The whole row opens the parcel; only the X removes it.
  recentOpen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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

// A crash while this screen draws shows a message and "Réessayer", not a white screen.
export { ErrorBoundary } from '../components/ScreenErrorBoundary';
