import { Host, Switch } from '@expo/ui';

import { useColors } from '../constants';

interface NativeSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * The platform's own toggle — a SwiftUI `Toggle` on iOS, a Material switch on
 * Android — tinted with the app accent. The row it sits in carries the label,
 * so the control itself stays unlabelled.
 */
export function NativeSwitch({ value, onValueChange, disabled }: NativeSwitchProps) {
  const colors = useColors();
  return (
    <Host matchContents seedColor={colors.accent}>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </Host>
  );
}
