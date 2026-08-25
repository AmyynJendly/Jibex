import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radii, Spacing, monoLabelStyle, useColors, Typography } from '../constants';

interface FormFieldProps extends TextInputProps {
  label: string;
  /** Right-aligned accessory in the label row. */
  labelRight?: ReactNode;
  /**
   * Accessory pinned inside the input box itself (e.g. the password eye
   * toggle). Sits over the trailing edge, so the text is inset to clear it.
   */
  inputAccessory?: ReactNode;
}

/** Labeled 52pt input box — the field style repeated for every credential/form input in the design. */
export function FormField({
  label,
  labelRight,
  inputAccessory,
  style,
  ...inputProps
}: FormFieldProps) {
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
      <View>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            Typography.input,
            styles.input,
            { backgroundColor: colors.bgElevated, borderColor: colors.separator, color: colors.text },
            inputAccessory ? styles.inputWithAccessory : null,
            style,
          ]}
          {...inputProps}
        />
        {inputAccessory && <View style={styles.accessory}>{inputAccessory}</View>}
      </View>
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
  inputWithAccessory: {
    paddingRight: 52,
  },
  accessory: {
    position: 'absolute',
    right: Spacing.xs,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
