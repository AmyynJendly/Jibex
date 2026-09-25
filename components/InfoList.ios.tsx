import { Host } from '@expo/ui';
import { Form, LabeledContent, Section, Text } from '@expo/ui/swift-ui';
import {
  background,
  foregroundStyle,
  listRowBackground,
  scrollContentBackground,
  textSelection,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useColors } from '../constants';
import type { InfoListProps } from './InfoList.types';

/**
 * Read-only records (personal info, vehicle) as an iOS Settings-style
 * grouped list: label on the left, value on the right, and a footnote under
 * the group saying why none of it can be edited. Values can be long-pressed
 * to copy, the way system detail screens allow.
 */
export function InfoList({ rows, notice }: InfoListProps) {
  const colors = useColors();
  return (
    <Host style={styles.fill}>
      <Form modifiers={[scrollContentBackground('hidden'), background(colors.bg)]}>
        <Section footer={<Text>{notice}</Text>}>
          {rows.map((row) => (
            <LabeledContent
              key={row.label}
              label={row.label}
              modifiers={[listRowBackground(colors.bgElevated), foregroundStyle(colors.text)]}>
              <Text modifiers={[foregroundStyle(colors.textSecondary), textSelection(true)]}>
                {row.value || '—'}
              </Text>
            </LabeledContent>
          ))}
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
