import { Platform } from 'react-native';

import { daysUntilExpiration } from '@/features/pantry/expirationUrgency';
import type { PantryItem } from '@/features/pantry/pantryItem';

import {
  EXPIRATION_NOTIFICATION_CHANNEL_ID,
  EXPIRATION_NOTIFICATION_TYPE,
  configureExpirationNotifications,
  getNotificationsApi,
  requestExpirationNotificationPermission,
} from './expirationNotifications';

/**
 * Replaces the 09:00 schedule with frequent alerts in development builds.
 *
 * Set to false to test the real 09:00 schedule in a development build.
 * Release builds always use the real schedule because __DEV__ is false.
 */
export const EXPIRATION_NOTIFICATION_DEV_SCHEDULE = __DEV__ && false;

/** Seconds between consecutive test alerts for the same item. */
export const DEV_NOTIFICATION_INTERVAL_SECONDS = 30;

/** Number of test alerts scheduled per item on each reconciliation. */
export const DEV_NOTIFICATION_COUNT = 5;

/**
 * Development replacement for reconcileExpirationNotifications().
 *
 * Uses the same eligibility rule as a real alert being due (the item is not
 * expired and is within the threshold), the same content and the same data
 * type, so tap handling and cancellation behave as in production. Instead of
 * one alert at 09:00 it schedules DEV_NOTIFICATION_COUNT one-shot alerts,
 * DEV_NOTIFICATION_INTERVAL_SECONDS apart. One-shot triggers are used because
 * iOS rejects repeating intervals under 60 seconds.
 *
 * Reconciliation runs again when pantry items, settings, or app state change,
 * which cancels pending alerts and restarts the sequence.
 *
 * @param items - Current device-local pantry items.
 * @param enabled - Whether expiration alerts are enabled.
 * @param thresholdDays - Days before expiration at which to alert.
 * @param now - Current local time used for eligibility checks.
 * @returns A promise that resolves after reconciliation, or immediately on web.
 */
export async function reconcileExpirationNotificationsForDev(
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

  if (!(await requestExpirationNotificationPermission())) {
    console.warn('[dev notifications] permission not granted');
    return;
  }
  await configureExpirationNotifications();

  const eligible = items.filter((item) => {
    const remaining = daysUntilExpiration(item.expirationDate, now);
    return remaining !== null && remaining >= 0 && remaining <= thresholdDays;
  });
  console.log(
    `[dev notifications] ${eligible.length} eligible item(s), ` +
      `${DEV_NOTIFICATION_COUNT} alert(s) each every ${DEV_NOTIFICATION_INTERVAL_SECONDS}s`,
  );

  await Promise.all(
    eligible.flatMap((item) =>
      Array.from({ length: DEV_NOTIFICATION_COUNT }, (_, index) =>
        notifications.scheduleNotificationAsync({
          content: {
            title: 'Food expiration reminder',
            body: `${item.name} is approaching its expiration date. (dev ${index + 1}/${DEV_NOTIFICATION_COUNT})`,
            data: { type: EXPIRATION_NOTIFICATION_TYPE, itemId: item.id },
          },
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: DEV_NOTIFICATION_INTERVAL_SECONDS * (index + 1),
            ...(Platform.OS === 'android' ? { channelId: EXPIRATION_NOTIFICATION_CHANNEL_ID } : {}),
          },
        }),
      ),
    ),
  );
}
