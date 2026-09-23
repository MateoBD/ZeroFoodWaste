import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useMessages } from '@/i18n/useMessages';
import { useTheme } from '@/theme/useTheme';

export default function RootLayout() {
  const { colors } = useTheme();
  const t = useMessages();

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ title: t('appTitle') }} />
      </Stack>
    </>
  );
}
