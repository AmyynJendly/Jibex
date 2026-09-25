import { Host } from '@expo/ui';
import { DisclosureGroup, Form, RNHostView, Section, Text } from '@expo/ui/swift-ui';
import {
  background,
  foregroundStyle,
  listRowBackground,
  listRowInsets,
  scrollContentBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useColors } from '../constants';
import type { FaqListProps } from './FaqList.types';

/** Where an inset-grouped list draws its cards on a phone: 20pt in from each edge. */
const SECTION_MARGIN = 20;

/**
 * The Help Center on iOS: a native grouped list where each question is an
 * Apple disclosure row — the system chevron turns and the answer folds open
 * with the system animation. The contact card stays on top, drawn by React
 * Native in Jibex colors.
 */
export function FaqList({ header, sectionTitle, faqs }: FaqListProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  return (
    <Host style={styles.fill}>
      <Form
        modifiers={[scrollContentBackground('hidden'), background(colors.bg), tint(colors.accent)]}>
        <Section
          modifiers={[
            listRowBackground('transparent'),
            listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
          ]}>
          <RNHostView matchContents>
            <View style={{ width: width - SECTION_MARGIN * 2 }}>{header as ReactElement}</View>
          </RNHostView>
        </Section>

        <Section title={sectionTitle}>
          {faqs.map((faq) => (
            <DisclosureGroup
              key={faq.question}
              label={faq.question}
              modifiers={[listRowBackground(colors.bgElevated), foregroundStyle(colors.text)]}>
              <Text modifiers={[foregroundStyle(colors.textSecondary)]}>{faq.answer}</Text>
            </DisclosureGroup>
          ))}
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
