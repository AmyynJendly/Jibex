import { Host, Switch } from '@expo/ui';
import { StyleSheet } from 'react-native';

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
    <Host style={styles.host} seedColor={colors.accent}>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </Host>
  );
}

/**
 * A fixed box the size of the system switch. Sizing to content left the host
 * at zero until SwiftUI reported back, so the row it sat in changed height a
 * moment after the screen had laid out — enough to push the first card of a
 * list over the Nearest First row.
 */
const styles = StyleSheet.create({
  host: { width: 51, height: 31 },
});
