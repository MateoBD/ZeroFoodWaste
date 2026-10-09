import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PantryProvider } from '@/features/pantry/PantryContext';
import { RecommendationProvider } from '@/features/recipes/recommendations/RecommendationContext';
import { useMessages } from '@/i18n/useMessages';
import { AppSettingsProvider } from '@/settings/AppSettingsContext';
import { useTheme } from '@/theme/useTheme';

/**
 * Configures the theme-aware native stack and status bar.
 *
 * @returns The application's root navigation layout.
 */
export default function RootLayout() {
  return (
    <AppSettingsProvider>
      <RootNavigation />
    </AppSettingsProvider>
  );
}

/**
 * Renders navigation using the active language, theme, and status-bar contrast.
 *
 * @returns The themed application stack and native status bar.
 */
function RootNavigation() {
  const { colors, isDark } = useTheme();
  const t = useMessages();

  return (
    <PantryProvider>
      <RecommendationProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
      </RecommendationProvider>
    </PantryProvider>
  );
}
