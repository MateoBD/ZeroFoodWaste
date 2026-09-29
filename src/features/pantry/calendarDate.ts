/**
 * Checks whether a date-only value represents a real calendar day.
 *
 * @param value - The value to validate in YYYY-MM-DD format.
 * @returns Whether the value is a valid calendar date.
 */
export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

/**
 * Checks whether a package date is today or later in the user's local calendar.
 *
 * @param value - The package date to check in YYYY-MM-DD format.
 * @param today - The local date used as today. Defaults to the current date.
 * @returns Whether the value is valid and is not earlier than today.
 */
export function isTodayOrFutureCalendarDate(value: string, today: Date = new Date()): boolean {
  return isValidCalendarDate(value) && value >= localDateToCalendarDate(today);
}

/**
 * Converts a date-only value to local noon, avoiding UTC day shifts.
 *
 * @param value - The date-only value to convert in YYYY-MM-DD format.
 * @returns The local Date, or null for an invalid calendar date.
 */
export function calendarDateToLocalDate(value: string): Date | null {
  if (!isValidCalendarDate(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

/**
 * Formats a Date using its local calendar fields.
 *
 * @param value - The Date whose local year, month, and day should be formatted.
 * @returns The local calendar date in YYYY-MM-DD format.
 */
export function localDateToCalendarDate(value: Date): string {
  const year = value.getFullYear().toString().padStart(4, '0');
  const month = (value.getMonth() + 1).toString().padStart(2, '0');
  const day = value.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
