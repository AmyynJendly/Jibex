import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radii, Spacing, monoStyle, useColors } from '../constants';

interface TrackingIdProps {
  value: string;
  /**
   * `lead` is the primary identifier on a card — the one the driver reads off
   * the parcel in their hand. `inline` is for supporting positions where the
   * id confirms context rather than being the thing you're looking for.
   */
  size?: 'lead' | 'inline';
  style?: StyleProp<ViewStyle>;
}

/**
 * A package / batch / transfer id, rendered the same way everywhere.
 *
 * These were previously styled at each call site and had drifted: 15pt on a
 * runsheet card, 13pt on the job detail, 12pt in muted tertiary grey on the
 * OTP screen. The 12pt grey one was the giveaway — that id is what the driver
 * matches against the label on a physical box, often one-handed, in a van, in
 * daylight. It has to be the most legible thing on the row, not the faintest.
 *
 * So: full-contrast text (never a muted grey), a contrasting chip behind it so
 * it reads as a code rather than as prose, and mono at a size that survives
 * arm's length. DM Mono ships only Regular and Medium in this project, so
 * Medium is as heavy as the typeface goes — the size, the contrast and the
 * chip do the rest of the work that bold would have done.
 */
export function TrackingId({ value, size = 'lead', style }: TrackingIdProps) {
  const colors = useColors();
  const lead = size === 'lead';

  return (
    <View
      style={[
        styles.chip,
        lead ? styles.chipLead : styles.chipInline,
        { backgroundColor: colors.bg },
        style,
      ]}>
      <Text
        style={[
          monoStyle(lead ? 17 : 14, 'medium'),
          styles.text,
          { color: colors.text },
        ]}
        numberOfLines={1}
        // Read aloud a character at a time; "TRK" is not a word.
        accessibilityLabel={value.split('').join(' ')}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  chipLead: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  chipInline: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  text: {
    letterSpacing: 0.6,
  },
});
