import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useMessages } from '@/i18n/useMessages';
import { useTheme } from '@/theme/useTheme';
import { PantryProvider } from '@/features/pantry/PantryContext';

/**
 * Configures the theme-aware native stack and status bar.
 *
 * @returns The application's root navigation layout.
 */
export default function RootLayout() {
  const { colors } = useTheme();
  const t = useMessages();

  return (
    <PantryProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipes/[ingredient]/index"
          options={{ headerBackTitle: t('recipesTab'), title: t('recipeResultsTitle') }}
        />
        <Stack.Screen
          name="recipes/[ingredient]/[mealId]"
          options={{ headerBackTitle: t('recipesTab'), title: t('recipeDetailTitle') }}
        />
      </Stack>
    </PantryProvider>
  );
}
