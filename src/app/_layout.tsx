import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { useEffect } from 'react';

import { PantryProvider, usePantry } from '@/features/pantry/PantryContext';
import { reconcileExpirationNotifications as reconcileScheduledExpirationNotifications } from '@/features/notifications/expirationNotifications';
import {
  EXPIRATION_NOTIFICATION_DEV_SCHEDULE,
  reconcileExpirationNotificationsForDev,
} from '@/features/notifications/expirationNotifications.devSchedule';
import { FavoriteRecipesProvider } from '@/features/recipes/favorites/FavoriteRecipesContext';
import { RecommendationProvider } from '@/features/recipes/recommendations/RecommendationContext';
import { useMessages } from '@/i18n/useMessages';
import { AppSettingsProvider, useAppSettings } from '@/settings/AppSettingsContext';
import { useTheme } from '@/theme/useTheme';

const reconcileImplementation = EXPIRATION_NOTIFICATION_DEV_SCHEDULE
  ? reconcileExpirationNotificationsForDev
  : reconcileScheduledExpirationNotifications;

let reconcileQueue: Promise<void> = Promise.resolve();

/**
 * Runs notification reconciliation strictly one call at a time.
 *
 * Each reconciliation cancels then reschedules alerts. Overlapping calls (for
 * example the initial load and an app-state change after the permission
 * dialog closes) would each cancel the same old set and then both schedule a
 * full new set, duplicating every alert.
 *
 * @param args - Arguments forwarded to the active reconciliation function.
 * @returns A promise that resolves after this call's reconciliation finishes.
 */
function reconcileExpirationNotifications(
  ...args: Parameters<typeof reconcileImplementation>
): Promise<void> {
  reconcileQueue = reconcileQueue
    .catch(() => undefined)
    .then(() => reconcileImplementation(...args));
  return reconcileQueue;
}

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
      <ExpirationNotificationCoordinator />
      <RecommendationProvider>
        <FavoriteRecipesProvider>
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
        </FavoriteRecipesProvider>
      </RecommendationProvider>
    </PantryProvider>
  );
}

/**
 * Keeps scheduled expiration notifications aligned with pantry and settings state.
 *
 * Reconciliation runs after pantry loading, after preference changes, and when
 * the application returns to the foreground so local schedules survive edits
 * and remain correct after the device clock or app state changes.
 *
 * @returns Nothing visible; this component owns notification side effects.
 */
function ExpirationNotificationCoordinator() {
  const { items, status } = usePantry();
  const { expirationAlertDays, expirationAlertsEnabled, ready } = useAppSettings();

  useEffect(() => {
    if (status !== 'ready' || !ready) return;
    void reconcileExpirationNotifications(items, expirationAlertsEnabled, expirationAlertDays);
  }, [expirationAlertDays, expirationAlertsEnabled, items, ready, status]);

  useEffect(() => {
    /**
     * Reconciles notification schedules when the app becomes active.
     *
     * @param nextState - The next native application lifecycle state.
     * @returns Nothing reconciliation is started asynchronously.
     */
    function handleAppStateChange(nextState: string) {
      if (nextState !== 'active' || status !== 'ready' || !ready) return;
      void reconcileExpirationNotifications(items, expirationAlertsEnabled, expirationAlertDays);
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [expirationAlertDays, expirationAlertsEnabled, items, ready, status]);

  return null;
}
