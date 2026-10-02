import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { Fonts, Radii, Spacing, monoStyle, useColors } from '../constants';
import { checkProgress, checklistKey } from '../lib/checklist';
import { normalizeCode } from '../lib/scanSession';
import { useChecklist } from '../lib/useChecklist';
import type { Transfer } from '../types';

interface TransferPickupCheckProps {
  transfer: Transfer;
  /** The confirmation is on its way to the server. */
  confirming: boolean;
  /** Every parcel is scanned: confirm the pickup. */
  onConfirm: () => void;
  /** The driver confirms without having scanned everything (a damaged label). */
  onConfirmWithoutScan: (progress: { done: number; total: number }) => void;
}

/**
 * The check before a transfer leaves: the driver scans every parcel of the
 * batch ("4/5 colis") and only then can confirm they have taken it.
 *
 * On the server one call puts the whole batch "in transit", with no scan and
 * no count. In the live test that was one tap for five parcels, three of
 * them not even the driver's own test parcels. The scan is done on the phone
 * (see lib/checklist); the call sent afterwards is the same as before.
 *
 * Scanning is the rule here — no ticking by hand, unlike a pickup — because
 * a transfer is the moment custody passes between two agencies. A label that
 * can't be read is the exception, so "Confirmer sans scan" stays, small,
 * behind a confirmation.
 */
export function TransferPickupCheck({
  transfer,
  confirming,
  onConfirm,
  onConfirmWithoutScan,
}: TransferPickupCheckProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const checkKey = checklistKey.transfer(transfer.id);
  const codes = transfer.parcelTrackingNumbers ?? [];
  const checked = useChecklist(checkKey);
  const progress = checkProgress(codes, checked);
  // The server sent no parcel list: nothing can be scanned against, so the
  // only way through is the confirmation dialog.
  const noList = codes.length === 0;

  return (
    <View style={[styles.block, { borderTopColor: colors.separator }]}>
      <View style={styles.head}>
        <View style={styles.count}>
          <Icon
            name={progress.complete ? 'checkmark-circle' : 'cube-outline'}
            size={17}
            color={progress.complete ? colors.success : colors.textSecondary}
          />
          <Text style={[monoStyle(15, 'medium'), { color: progress.complete ? colors.success : colors.text }]}>
            {noList
              ? t('common.package', { count: transfer.parcelCount })
              : t('transfers.check.progress', { done: progress.done, total: progress.total })}
          </Text>
        </View>
        {!noList && !progress.complete && (
          <AnimatedPressable
            scaleTo={0.95}
            accessibilityRole="button"
            style={[styles.scanButton, { backgroundColor: colors.accentSoft }]}
            onPress={() =>
              router.push({
                pathname: '/scanner',
                params: { checkKey, expected: JSON.stringify(codes), checkKind: 'transfer' },
              })
            }>
            <Icon name="scan-outline" size={15} color={colors.accent} />
            <Text style={[styles.scanButtonText, { color: colors.accent }]}>{t('transfers.check.scan')}</Text>
          </AnimatedPressable>
        )}
      </View>

      {!noList && (
        <View>
          {codes.map((code) => {
            const isChecked = checked.has(normalizeCode(code));
            return (
              <View key={code} style={[styles.parcelRow, { borderTopColor: colors.separator }]}>
                <Icon
                  name={isChecked ? 'checkmark-circle' : 'scan-outline'}
                  size={16}
                  color={isChecked ? colors.success : colors.textTertiary}
                />
                <Text
                  style={[styles.parcelCode, { color: isChecked ? colors.text : colors.textSecondary }]}
                  numberOfLines={1}>
                  {code}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t(noList ? 'transfers.check.noList' : progress.complete ? 'transfers.check.ready' : 'transfers.check.hint')}
      </Text>

      <PrimaryButton
        label={t('transfers.check.confirm')}
        height={46}
        loading={confirming}
        disabled={!noList && !progress.complete}
        onPress={() => (noList ? onConfirmWithoutScan({ done: 0, total: 0 }) : onConfirm())}
      />

      {!noList && !progress.complete && (
        <AnimatedPressable
          scaleTo={0.97}
          accessibilityRole="button"
          style={styles.withoutScan}
          onPress={() => onConfirmWithoutScan({ done: progress.done, total: progress.total })}>
          <Text style={[styles.withoutScanText, { color: colors.textSecondary }]}>
            {t('transfers.check.withoutScan')}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  scanButtonText: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  parcelCode: {
    ...monoStyle(13, 'medium'),
    flex: 1,
  },
  hint: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  withoutScan: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  withoutScanText: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
