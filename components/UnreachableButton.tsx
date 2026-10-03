import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { Fonts, Spacing, useColors } from '../constants';
import { unreachableStep } from '../lib/deliveryGate';
import { isUnreachable, markUnreachable } from '../lib/deviceStore';

interface UnreachableButtonProps {
  parcelId: string;
  /** How many times Call was pressed for this parcel. */
  callAttempts: number;
}

/**
 * "Client injoignable — continuer": the way on when the call went nowhere.
 *
 * The rule stays: Call must be pressed once before a parcel can be marked
 * delivered. This appears only after that, so a driver whose customer never
 * picked up — or stands in front of them — sees plainly that they may go on.
 * Tapping it notes "client injoignable" on the phone; the note goes to the
 * agency with a failure, next to the call times.
 */
export function UnreachableButton({ parcelId, callAttempts }: UnreachableButtonProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [noted, setNoted] = useState(() => isUnreachable(parcelId));
  const step = unreachableStep({ callAttempts, unreachable: noted });
  if (step === null) return null;

  if (step === 'noted') {
    return (
      <View style={styles.row}>
        <Icon name="checkmark-circle-outline" size={14} color={colors.textTertiary} />
        <Text style={[styles.text, { color: colors.textTertiary }]}>{t('statusUpdate.unreachableNoted')}</Text>
      </View>
    );
  }

  return (
    <AnimatedPressable
      scaleTo={0.97}
      accessibilityRole="button"
      style={styles.row}
      onPress={async () => {
        setNoted(true);
        await markUnreachable(parcelId);
        showToast(t('statusUpdate.unreachableToast'));
      }}>
      <Icon name="call-outline" size={14} color={colors.accent} />
      <Text style={[styles.text, styles.link, { color: colors.accent }]}>{t('statusUpdate.unreachable')}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
  },
  text: {
    fontFamily: Fonts.archivoMedium,
    fontSize: 13,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
