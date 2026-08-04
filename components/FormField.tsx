import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radii, Spacing, Typography, useColors } from '../constants';

interface FormFieldProps extends TextInputProps {
  label: string;
}

/** Labeled 52pt input box — the field style repeated for every credential/form input in the design. */
export function FormField({ label, style, ...inputProps }: FormFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[Typography.footnote, styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
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
  label: {
    paddingLeft: Spacing.xxs,
  },
  input: {
    height: 52,
    borderRadius: Radii.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
});
