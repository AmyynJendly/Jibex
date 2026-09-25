import { BottomSheet, RNHostView } from '@expo/ui';
import { useState, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PrimaryButton } from './PrimaryButton';
import { TrackingId } from './TrackingId';
import { Radii, Spacing, Typography, useColors } from '../constants';
import type { Transfer } from '../types';

const PADDING = { top: Spacing.lg, bottom: Spacing.lg, left: Spacing.xxl, right: Spacing.xxl };
/** Used only until the content has been measured once. */
const ESTIMATED_CONTENT_HEIGHT = 420;
const QR_SIZE = 220;
const isNative = Platform.OS !== 'web';

interface HandoffQrSheetProps {
  /** The sheet is open whenever this is set. */
  transfer: Transfer | null;
  onClose: () => void;
}

/**
 * The transfer's handoff QR, in the platform's own bottom sheet (a SwiftUI
 * sheet on iOS) instead of unfolding inside the card: bigger and centred, so
 * the receiving agent can scan it straight off the phone, and swiped away
 * when done.
 *
 * Like the status sheet, the content is measured and that height becomes the
 * sheet's only detent, so it opens exactly as tall as the QR needs.
 */
export function HandoffQrSheet({ transfer: requested, onClose }: HandoffQrSheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Keep showing the last transfer while the sheet animates closed.
  const [lastTransfer, setLastTransfer] = useState(requested);
  if (requested && requested !== lastTransfer) setLastTransfer(requested);
  const transfer = requested ?? lastTransfer;

  const [contentHeight, setContentHeight] = useState(ESTIMATED_CONTENT_HEIGHT);
  const sheetHeight = contentHeight + PADDING.top + PADDING.bottom + insets.bottom;

  function handleLayout(event: LayoutChangeEvent) {
    const measured = Math.ceil(event.nativeEvent.layout.height);
    if (measured > 0 && measured !== contentHeight) setContentHeight(measured);
  }

  const hosted = (content: ReactElement) =>
    isNative ? <RNHostView>{content}</RNHostView> : content;

  return (
    <BottomSheet
      isPresented={!!requested}
      onDismiss={onClose}
      containerColor={colors.bgElevated}
      contentPadding={PADDING}
      snapPoints={isNative ? [{ height: sheetHeight }] : undefined}>
      {transfer &&
        hosted(
          <View style={styles.sheet} onLayout={handleLayout}>
            <TrackingId value={transfer.id} size="inline" />
            <Text style={[Typography.subhead, styles.route, { color: colors.textSecondary }]}>
              {transfer.originAgency} → {transfer.destinationAgency}
            </Text>
            {/* Always on white: scanners read dark-on-light, in either theme. */}
            <View style={styles.qrCard}>
              <QRCode value={`JIBEX-TRANSFER:${transfer.id}`} size={QR_SIZE} />
            </View>
            <Text style={[Typography.footnote, styles.hint, { color: colors.textSecondary }]}>
              {t('transfers.qrInfoNote')}
            </Text>
            <PrimaryButton label={t('transfers.hideQr')} height={50} onPress={onClose} style={styles.done} />
          </View>
        )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  route: {
    textAlign: 'center',
  },
  qrCard: {
    padding: Spacing.lg,
    borderRadius: Radii.card,
    backgroundColor: '#FFFFFF',
  },
  hint: {
    textAlign: 'center',
    maxWidth: 300,
  },
  done: {
    alignSelf: 'stretch',
    marginTop: Spacing.xs,
  },
});
