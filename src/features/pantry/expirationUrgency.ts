import { isValidCalendarDate, localDateToCalendarDate } from './calendarDate';

/**
 * Represents how soon a pantry item should be used.
 *
 * - `expired`: the package date is before today.
 * - `urgent`: expires today or within 2 days.
 * - `soon`: expires in 3 to 5 days.
 * - `fresh`: expires in more than 5 days.
 */
export type ExpirationUrgency = 'expired' | 'urgent' | 'soon' | 'fresh';

/** The last day count, inclusive, that is still urgent. */
export const URGENT_MAX_DAYS = 2;

/** The last day count, inclusive, that is still soon. */
export const SOON_MAX_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calendarDateToDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/**
 * Counts local calendar days from today until a package date.
 *
 * @param expirationDate - The package date in YYYY-MM-DD format.
 * @param today - The local date used as today. Defaults to the current date.
 * @returns Days remaining (0 for today, negative when expired), or null for an invalid date.
 */
export function daysUntilExpiration(expirationDate: string, today: Date = new Date()): number | null {
  if (!isValidCalendarDate(expirationDate)) return null;

  return calendarDateToDayNumber(expirationDate) - calendarDateToDayNumber(localDateToCalendarDate(today));
}

/**
 * Classifies a package date by how soon the item should be used.
 *
 * @param expirationDate - The package date in YYYY-MM-DD format.
 * @param today - The local date used as today. Defaults to the current date.
 * @returns The urgency level, or null for an invalid date.
 */
export function getExpirationUrgency(expirationDate: string, today: Date = new Date()): ExpirationUrgency | null {
  const days = daysUntilExpiration(expirationDate, today);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= URGENT_MAX_DAYS) return 'urgent';
  if (days <= SOON_MAX_DAYS) return 'soon';
  return 'fresh';
}
