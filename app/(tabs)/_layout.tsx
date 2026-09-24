import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { NextStopAccessory } from '../../components/NextStopAccessory';
import { useColors } from '../../constants';
import { useNextStop } from '../../lib/useNextStop';

/**
 * Native platform tab bar — UITabBar on iOS, BottomNavigationView on Android.
 *
 * This is what gets us the real iOS 26 Liquid Glass tab bar (and its
 * scroll-edge translucency + minimize behaviour) rather than a JS
 * approximation of it. Icons are SF Symbols on iOS.
 */
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const { nextStop, index } = useNextStop();

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={colors.accent}>
      {/* iOS 26+ only — Android and web render nothing here. Gone once the
          day's last stop is done, rather than showing an empty bar. */}
      {nextStop && (
        <NativeTabs.BottomAccessory>
          <NextStopAccessory stop={nextStop} index={index} />
        </NativeTabs.BottomAccessory>
      )}

      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          drawable="ic_home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="runsheets">
        <NativeTabs.Trigger.Label>{t('tabs.runsheets')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.clipboard', selected: 'list.bullet.clipboard.fill' }}
          drawable="ic_runsheets"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alerts">
        <NativeTabs.Trigger.Label>{t('tabs.alerts')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bell', selected: 'bell.fill' }}
          drawable="ic_alerts"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          drawable="ic_profile"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
