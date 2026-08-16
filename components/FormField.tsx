import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radii, Spacing, monoLabelStyle, useColors, Typography } from '../constants';

interface FormFieldProps extends TextInputProps {
  label: string;
  /** Right-aligned accessory in the label row (e.g. the "View" PIN-reveal toggle). */
  labelRight?: ReactNode;
}

/** Labeled 52pt input box — the field style repeated for every credential/form input in the design. */
export function FormField({ label, labelRight, style, ...inputProps }: FormFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text
          numberOfLines={1}
          style={[monoLabelStyle(11, 0.08), styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {labelRight}
      </View>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          Typography.input,
          styles.input,
          { backgroundColor: colors.bgElevated, borderColor: colors.separator, color: colors.text },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
    paddingLeft: Spacing.xxs,
    paddingRight: Spacing.sm,
    textTransform: 'uppercase',
  },
  input: {
    height: 52,
    borderRadius: Radii.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
});
