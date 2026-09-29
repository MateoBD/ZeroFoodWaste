import {
  calendarDateToLocalDate,
  isTodayOrFutureCalendarDate,
  isValidCalendarDate,
  localDateToCalendarDate,
} from './calendarDate';

describe('calendar dates', () => {
  it('converts date-only values without changing the local calendar day', () => {
    const date = calendarDateToLocalDate('2028-02-29');

    expect(date).not.toBeNull();
    expect(localDateToCalendarDate(date!)).toBe('2028-02-29');
  });

  it('rejects invalid date-only values before conversion', () => {
    expect(isValidCalendarDate('2027-02-29')).toBe(false);
    expect(calendarDateToLocalDate('2027-02-29')).toBeNull();
  });

  it('accepts today and future dates but rejects earlier local calendar dates', () => {
    const today = new Date(2026, 8, 29, 12);

    expect(isTodayOrFutureCalendarDate('2026-09-29', today)).toBe(true);
    expect(isTodayOrFutureCalendarDate('2026-09-30', today)).toBe(true);
    expect(isTodayOrFutureCalendarDate('2026-09-28', today)).toBe(false);
  });
});
