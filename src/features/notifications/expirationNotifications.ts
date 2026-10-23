import { Platform } from 'react-native';

import { calendarDateToLocalDate, isValidCalendarDate } from '@/features/pantry/calendarDate';
import { daysUntilExpiration } from '@/features/pantry/expirationUrgency';
import type { PantryItem } from '@/features/pantry/pantryItem';

type NotificationsApi = typeof import('expo-notifications');

/** Represents the response produced when a user taps a notification. */
export type ExpirationNotificationResponse = import('expo-notifications').NotificationResponse;

let notificationsApi: NotificationsApi | null = null;

/** Identifies the Android channel used for expiration alerts. */
export const EXPIRATION_NOTIFICATION_CHANNEL_ID = 'expiration-alerts';

/** Identifies notification data created by this feature. */
export const EXPIRATION_NOTIFICATION_TYPE = 'expiration-alert';

/** The default number of days before expiry at which an alert is sent. */
export const DEFAULT_EXPIRATION_ALERT_DAYS = 3;

/** The earliest accepted user-configurable alert threshold. */
export const MIN_EXPIRATION_ALERT_DAYS = 1;

/** The latest accepted user-configurable alert threshold. */
export const MAX_EXPIRATION_ALERT_DAYS = 7;

/** web notifications are not supported */
/**
 * Checks whether native scheduled notifications can be used on this platform.
 *
 * Web builds intentionally return false because Expo does not provide web
 * notification support for this module.
 *
 * @returns Whether the current platform supports this feature.
 */
export function supportsExpirationNotifications(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Loads the notification module only when the current runtime supports it.
 *
 * Local alerts are supported in Expo Go. If the runtime still cannot expose
 * the native module, the feature remains unavailable without crashing the app.
 *
 * @returns The notification API, or null when unavailable in this runtime.
 */
export function getNotificationsApi(): NotificationsApi | null {
  if (!supportsExpirationNotifications()) return null;
  if (!notificationsApi) {
    // Deliberately require lazily so unsupported runtimes never evaluate the
    // notification package. Metro may expose an ESM package through either a
    // namespace object or a `default` export, so normalize both shapes.
    let loaded: (Partial<NotificationsApi> & { default?: NotificationsApi }) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as
        | (Partial<NotificationsApi> & { default?: NotificationsApi })
        | undefined;
    } catch {
      return null;
    }

    const candidate =
      typeof loaded?.setNotificationHandler === 'function' ? loaded : loaded?.default;
    if (!candidate || typeof candidate.setNotificationHandler !== 'function') return null;

    notificationsApi = candidate as NotificationsApi;
    notificationsApi.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return notificationsApi;
}

/**
 * Creates the Android notification channel used by expiration alerts.
 *
 * The operation is a no-op on iOS and web, allowing shared application code
 * to call it without platform branches.
 *
 * @returns A promise that resolves when channel setup is complete.
 */
export async function configureExpirationNotifications(): Promise<void> {
  const notifications = getNotificationsApi();
  if (Platform.OS !== 'android' || !notifications) return;
  await notifications.setNotificationChannelAsync(EXPIRATION_NOTIFICATION_CHANNEL_ID, {
    name: 'Expiration alerts',
    importance: notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Requests permission to display expiration alerts when necessary.
 *
 * @returns Whether the user has authorized notifications, including iOS
 * provisional authorization.
 */
export async function requestExpirationNotificationPermission(): Promise<boolean> {
  const notifications = getNotificationsApi();
  if (!notifications) return false;
  await configureExpirationNotifications();
  const current = await notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Subscribes to taps on expiration notifications.
 *
 * @param listener - Callback invoked with each tapped notification response.
 * @returns A removable subscription, or null when notifications are unavailable.
 */
export function addExpirationNotificationResponseListener(
  listener: (response: ExpirationNotificationResponse) => void,
) {
  return getNotificationsApi()?.addNotificationResponseReceivedListener(listener) ?? null;
}

/**
 * Reads the most recent expiration-notification response on app startup.
 *
 * @returns The latest response, or null when there was none or the API is unavailable.
 */
export function getLastExpirationNotificationResponse(): ExpirationNotificationResponse | null {
  return getNotificationsApi()?.getLastNotificationResponse() ?? null;
}

/**
 * Calculates the local delivery time for an item's expiration alert.
 *
 * Alerts are delivered at 09:00 local time on the configured threshold date.
 * Items already inside the threshold are moved to the next available 09:00.
 *
 * @param expirationDate - The item's date-only expiration value.
 * @param thresholdDays - The number of days before expiration to alert.
 * @param now - The current local time used for deterministic calculations.
 * @returns The future local delivery date, or null for invalid input.
 */
export function getExpirationNotificationDate(
  expirationDate: string,
  thresholdDays: number,
  now: Date = new Date(),
): Date | null {
  if (!isValidCalendarDate(expirationDate) || !Number.isInteger(thresholdDays)) return null;
  const expiration = calendarDateToLocalDate(expirationDate);
  if (!expiration) return null;
  const remaining = daysUntilExpiration(expirationDate, now);
  if (remaining === null || remaining < 0) return null;

  const delivery = new Date(expiration);
  delivery.setDate(delivery.getDate() - thresholdDays);
  delivery.setHours(9, 0, 0, 0);
  if (delivery.getTime() <= now.getTime()) {
    delivery.setTime(now.getTime());
    delivery.setHours(9, 0, 0, 0);
    if (delivery.getTime() <= now.getTime()) delivery.setDate(delivery.getDate() + 1);
  }
  return delivery;
}

/**
 * Synchronizes native expiration alerts with the current pantry contents.
 *
 * Existing alerts created by this feature are removed before current eligible
 * items are scheduled. This keeps the implementation deterministic when an
 * item is edited, consumed, or discarded and avoids maintaining a second ID
 * store alongside the pantry repository.
 *
 * @param items - Current device-local pantry items.
 * @param enabled - Whether expiration alerts are enabled.
 * @param thresholdDays - Days before expiration at which to alert.
 * @param now - Current local time used for deterministic scheduling.
 * @returns A promise that resolves after reconciliation, or immediately on web.
 */
export async function reconcileExpirationNotifications(
  items: readonly PantryItem[],
  enabled: boolean,
  thresholdDays: number,
  now: Date = new Date(),
): Promise<void> {
  const notifications = getNotificationsApi();
  if (!notifications) return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.type === EXPIRATION_NOTIFICATION_TYPE)
      .map((notification) => notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
  if (!enabled) return;

  await configureExpirationNotifications();
  const eligible = items
    .map((item) => ({ item, date: getExpirationNotificationDate(item.expirationDate, thresholdDays, now) }))
    .filter((entry): entry is { item: PantryItem; date: Date } => entry.date !== null);

  await Promise.all(eligible.map(({ item, date }) => notifications.scheduleNotificationAsync({
    content: {
      title: 'Food expiration reminder',
      body: `${item.name} is approaching its expiration date.`,
      data: { type: EXPIRATION_NOTIFICATION_TYPE, itemId: item.id },
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: EXPIRATION_NOTIFICATION_CHANNEL_ID } : {}),
    },
  })));
}
