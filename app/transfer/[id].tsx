import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadError } from '../../components/LoadError';
import { MetaChip } from '../../components/MetaChip';
import { SkeletonRow } from '../../components/Skeleton';
import { TrackingId } from '../../components/TrackingId';
import { Fonts, Radii, Spacing, getCardShadow, monoLabelStyle, monoStyle, useColors } from '../../constants';
import { formatCurrency } from '../../lib/currency';
import { parcelStatusLabel } from '../../lib/parcelStatus';
import { refreshTransfers, useScreenState, useTransfers } from '../../lib/query';
import { formatStamp, opensDetail, transferStage, transferTimeline } from '../../lib/transferState';
import { useAutoRefresh } from '../../lib/useAutoRefresh';

/**
 * One ongoing transfer, in full — what the Android app's detail screen
 * shows: the header, the itinerary, the driver, the dated history, every
 * parcel with its status and cash, and the notes.
 *
 * Read-only: taking the transfer (the scan, then "Confirmer la prise en
 * charge") stays on the list card. A transfer in History never opens here.
 */
export default function TransferDetailScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { id } = useLocalSearchParams<{ id: string }>();
  // The parcels' statuses change as the destination agency scans them in.
  useAutoRefresh(refreshTransfers);
  const transfersQuery = useTransfers();
  const screen = useScreenState([transfersQuery]);
  const transfer = transfersQuery.data?.find((item) => item.id === id) ?? null;

  const card = [styles.card, { backgroundColor: colors.bgElevated }, getCardShadow(scheme)];
  const label = [monoLabelStyle(11, 0.06), { color: colors.textSecondary }];

  if (!transfer || !opensDetail(transfer)) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: id ?? t('transfers.headerTitle') }} />
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          {screen.isError && !transfersQuery.data ? (
            <LoadError onRetry={screen.retry} retrying={screen.retrying} />
          ) : !transfersQuery.data ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (
            <EmptyState icon="swap-horizontal-outline" title={t('transfers.detail.notFound')} />
          )}
        </ScrollView>
      </View>
    );
  }

  const stage = transferStage(transfer);
  const detail = transfer.detail;
  const parcels = detail?.parcels ?? [];
  const timeline = transferTimeline(detail ?? {});
  const anomalies = detail
    ? [
        detail.missingParcels > 0 ? t('transfers.detail.missing', { count: detail.missingParcels }) : null,
        detail.extraParcels > 0 ? t('transfers.detail.extra', { count: detail.extraParcels }) : null,
        detail.damagedParcels > 0 ? t('transfers.detail.damaged', { count: detail.damagedParcels }) : null,
      ].filter((line): line is string => !!line)
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: transfer.id }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={card}>
          <View style={styles.headRow}>
            <TrackingId value={transfer.id} />
            <View style={[styles.status, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.statusText, { color: colors.accent }]} numberOfLines={1}>
                {stage === 'toLoad' ? t('transfers.status.readyForPickup') : t('transfers.status.inTransit')}
              </Text>
            </View>
          </View>
          <View style={styles.chips}>
            {detail?.type && <MetaChip icon="git-branch-outline" label={t('transfers.detail.type.' + detail.type)} />}
            <MetaChip icon="cube-outline" tone="accent" label={t('common.package', { count: transfer.parcelCount })} />
          </View>
        </View>

        {/* Itinerary */}
        <View style={card}>
          <Text style={label}>{t('transfers.detail.itinerary')}</Text>
          <View style={styles.place}>
            <Icon name="arrow-up-circle-outline" size={18} color={colors.accent} />
            <View style={styles.placeText}>
              <Text style={[styles.small, { color: colors.textSecondary }]}>{t('transfers.detail.departure')}</Text>
              <Text style={[styles.strong, { color: colors.text }]}>{transfer.originAgency}</Text>
            </View>
          </View>
          <View style={styles.place}>
            <Icon name="arrow-down-circle-outline" size={18} color={colors.success} />
            <View style={styles.placeText}>
              <Text style={[styles.small, { color: colors.textSecondary }]}>{t('transfers.detail.arrival')}</Text>
              <Text style={[styles.strong, { color: colors.text }]}>{transfer.destinationAgency}</Text>
            </View>
          </View>
        </View>

        {/* Driver */}
        {(detail?.driverName || detail?.vehicle) && (
          <View style={card}>
            <Text style={label}>{t('transfers.detail.driver')}</Text>
            <View style={styles.place}>
              <Icon name="person-circle-outline" size={20} color={colors.textSecondary} />
              <View style={styles.placeText}>
                {detail.driverName && <Text style={[styles.strong, { color: colors.text }]}>{detail.driverName}</Text>}
                {detail.vehicle && (
                  <Text style={[styles.small, { color: colors.textSecondary }]}>
                    {t('transfers.detail.vehicle', { plate: detail.vehicle })}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={card}>
          <Text style={label}>{t('transfers.detail.history')}</Text>
          {timeline.map((step) => (
            <View key={step.key} style={styles.step}>
              <Icon
                name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={step.done ? (step.key === 'cancelled' ? colors.danger : colors.success) : colors.textTertiary}
              />
              <View style={styles.placeText}>
                <Text style={[step.done ? styles.strong : styles.pending, { color: step.done ? colors.text : colors.textTertiary }]}>
                  {t('transfers.detail.steps.' + step.key)}
                </Text>
                {formatStamp(step.at) && (
                  <Text style={[styles.stamp, { color: colors.textSecondary }]}>{formatStamp(step.at)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* What the destination agency found, if it found anything wrong. */}
        {anomalies.length > 0 && (
          <View style={[card, { borderColor: colors.danger, borderWidth: 1.5 }]}>
            <Text style={[monoLabelStyle(11, 0.06), { color: colors.danger }]}>{t('transfers.detail.anomalies')}</Text>
            {anomalies.map((line) => (
              <Text key={line} style={[styles.strong, { color: colors.text }]}>
                {line}
              </Text>
            ))}
          </View>
        )}

        {/* Parcels */}
        <View style={card}>
          <Text style={label}>{t('transfers.detail.parcels', { count: parcels.length })}</Text>
          {parcels.length === 0 ? (
            <Text style={[styles.small, { color: colors.textSecondary }]}>{t('transfers.detail.noParcels')}</Text>
          ) : (
            parcels.map((parcel, index) => (
              <View
                key={parcel.trackingNumber}
                style={[styles.parcel, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
                <View style={styles.parcelHead}>
                  <Text style={[styles.tracking, { color: colors.text }]} numberOfLines={1}>
                    {parcel.trackingNumber}
                  </Text>
                  {parcel.status && (
                    <View style={[styles.status, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.statusText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {parcelStatusLabel(t, parcel.status)}
                      </Text>
                    </View>
                  )}
                </View>
                {(parcel.recipientName || parcel.recipientCity) && (
                  <Text style={[styles.small, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[parcel.recipientName, parcel.recipientCity].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {parcel.price !== undefined && parcel.price > 0 && (
                  <View style={styles.chips}>
                    <MetaChip icon="cash-outline" tone="accent" label={formatCurrency(parcel.price)} />
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        {detail?.notes && (
          <View style={card}>
            <Text style={label}>{t('transfers.detail.notes')}</Text>
            <Text style={[styles.note, { color: colors.text }]}>{detail.notes}</Text>
          </View>
        )}
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
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  status: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
    flexShrink: 1,
  },
  statusText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  placeText: {
    flex: 1,
    gap: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  strong: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  pending: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  small: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  stamp: {
    ...monoStyle(12),
  },
  parcel: {
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
  parcelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  tracking: {
    ...monoStyle(14, 'medium'),
    flexShrink: 1,
  },
  note: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 14,
    lineHeight: 20,
  },
});
