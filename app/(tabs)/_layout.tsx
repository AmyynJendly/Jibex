import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColors } from '../../constants';

/**
 * Native platform tab bar — UITabBar on iOS, BottomNavigationView on Android.
 *
 * This is what gets us the real iOS 26 Liquid Glass tab bar (and its
 * scroll-edge translucency + minimize behaviour) rather than a JS
 * approximation of it. Icons are SF Symbols on iOS.
 */
export default function TabsLayout() {
  const colors = useColors();

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={colors.accent}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          drawable="ic_home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="runsheets">
        <NativeTabs.Trigger.Label>Runsheets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.clipboard', selected: 'list.bullet.clipboard.fill' }}
          drawable="ic_runsheets"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alerts">
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bell', selected: 'bell.fill' }}
          drawable="ic_alerts"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          drawable="ic_profile"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
