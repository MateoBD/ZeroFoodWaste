import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useMessages } from '@/i18n/useMessages';
import { useTheme } from '@/theme/useTheme';

/**
 * Configures the native bottom navigation for pantry and recipe suggestions.
 *
 * @returns The platform-native tab layout.
 */
export default function TabLayout() {
  const t = useMessages();
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      disableTransparentOnScrollEdge
      tintColor={colors.accent}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="inventory_2" sf={{ default: 'list.bullet', selected: 'list.bullet.circle.fill' }} />
        <NativeTabs.Trigger.Label>{t('pantryTab')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recipes">
        <NativeTabs.Trigger.Icon md="restaurant" sf={{ default: 'fork.knife', selected: 'fork.knife.circle.fill' }} />
        <NativeTabs.Trigger.Label>{t('recipesTab')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
