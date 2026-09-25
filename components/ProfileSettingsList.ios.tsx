import { Host } from '@expo/ui';
import {
  Button,
  Form,
  HStack,
  Image,
  Label,
  LabeledContent,
  Picker,
  RNHostView,
  Section,
  Spacer,
  Text,
  Toggle,
} from '@expo/ui/swift-ui';
import {
  background,
  foregroundStyle,
  listRowBackground,
  listRowInsets,
  pickerStyle,
  scrollContentBackground,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useColors } from '../constants';
import type { ProfileSettingsListProps } from './ProfileSettingsList.types';

/** Where an inset-grouped list draws its cards on a phone: 20pt in from each edge. */
const SECTION_MARGIN = 20;

/**
 * Profile on iOS: one native grouped list, laid out the way the Settings app
 * is — sections, system switches, a menu picker for the language, the
 * version as a plain labelled row and Log Out as a destructive button.
 *
 * It stays in Jibex colors (kraft page, label-white rows, kraft switches)
 * and the driver card rides at the top as a React Native view.
 */
export function ProfileSettingsList(props: ProfileSettingsListProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const rowBackground = listRowBackground(colors.bgElevated);

  const navRow = (title: string, icon: SFSymbol, onPress: () => void) => (
    <Button onPress={onPress} modifiers={[rowBackground]}>
      <HStack>
        <Label title={title} systemImage={icon} modifiers={[foregroundStyle(colors.text)]} />
        <Spacer />
        <Image systemName="chevron.right" size={13} color={colors.textTertiary} />
      </HStack>
    </Button>
  );

  const toggleRow = (
    title: string,
    icon: SFSymbol,
    isOn: boolean,
    onChange: (next: boolean) => void
  ) => (
    <Toggle
      label={title}
      systemImage={icon}
      isOn={isOn}
      onIsOnChange={onChange}
      modifiers={[rowBackground, foregroundStyle(colors.text)]}
    />
  );

  return (
    <Host style={styles.fill}>
      <Form
        modifiers={[scrollContentBackground('hidden'), background(colors.bg), tint(colors.accent)]}>
        {/* The driver card and stats, drawn by React Native, on a clear row. */}
        <Section
          modifiers={[
            listRowBackground('transparent'),
            listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
          ]}>
          <RNHostView matchContents>
            <View style={{ width: width - SECTION_MARGIN * 2 }}>{props.header as ReactElement}</View>
          </RNHostView>
        </Section>

        <Section title={props.labels.account}>
          {navRow(props.labels.personalInfo, 'person', props.onOpenPersonalInfo)}
          {navRow(props.labels.vehicle, 'car', props.onOpenVehicle)}
        </Section>

        <Section>
          <Picker
            label={props.labels.language}
            systemImage="globe"
            selection={props.language}
            onSelectionChange={props.onLanguageChange}
            modifiers={[pickerStyle('menu'), rowBackground, foregroundStyle(colors.text)]}>
            {props.languages.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section title={props.labels.security}>
          {toggleRow(props.labels.biometric, 'faceid', props.biometric, props.onBiometricChange)}
          {toggleRow(props.labels.haptics, 'iphone.radiowaves.left.and.right', props.haptics, props.onHapticsChange)}
          {props.nextStopBar !== null &&
            toggleRow(
              props.labels.nextStopBar,
              'location',
              props.nextStopBar,
              props.onNextStopBarChange
            )}
          {toggleRow(props.labels.newJobAlerts, 'bell', props.newJobAlerts, props.onNewJobAlertsChange)}
        </Section>

        <Section title={props.labels.support}>
          {navRow(props.labels.helpCenter, 'questionmark.circle', props.onOpenHelpCenter)}
          <LabeledContent label={props.labels.appVersion} modifiers={[rowBackground]}>
            <Text modifiers={[foregroundStyle(colors.textSecondary)]}>{props.appVersion}</Text>
          </LabeledContent>
          <Button
            role="destructive"
            onPress={props.onLogOut}
            modifiers={[rowBackground]}>
            <Label
              title={props.labels.logOut}
              systemImage="rectangle.portrait.and.arrow.right"
              modifiers={[foregroundStyle(colors.danger)]}
            />
          </Button>
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
