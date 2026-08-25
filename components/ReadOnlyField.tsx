import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii, Spacing, Typography, useColors } from '../constants';

interface ReadOnlyFieldProps {
  label: string;
  value: string;
}

/**
 * A labelled value the driver can read but not change — the agency owns
 * personal and vehicle records, so those screens display rather than edit.
 * Deliberately not a disabled `TextInput`: there's no caret, no keyboard,
 * and nothing that looks like it might become editable.
 */
export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.valueBox, { backgroundColor: colors.bgElevated, borderColor: colors.separator }]}>
        <Text style={[Typography.body, { color: colors.text }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.archivoSemiBold,
    fontSize: 13,
    paddingLeft: Spacing.xxs,
  },
  valueBox: {
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: Radii.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
