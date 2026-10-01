import { daysUntilExpiration, getExpirationUrgency } from './expirationUrgency';

// Late evening local time, so a UTC-based calculation would shift the day.
const today = new Date(2026, 2, 28, 23, 30);

describe('expiration urgency', () => {
  it('counts local calendar days, including across a month end', () => {
    expect(daysUntilExpiration('2026-03-28', today)).toBe(0);
    expect(daysUntilExpiration('2026-03-29', today)).toBe(1);
    expect(daysUntilExpiration('2026-04-02', today)).toBe(5);
    expect(daysUntilExpiration('2026-03-27', today)).toBe(-1);
  });

  it.each([
    ['2026-03-27', 'expired'],
    ['2026-03-28', 'urgent'],
    ['2026-03-30', 'urgent'],
    ['2026-03-31', 'soon'],
    ['2026-04-02', 'soon'],
    ['2026-04-03', 'fresh'],
  ])('classifies %s as %s', (expirationDate, urgency) => {
    expect(getExpirationUrgency(expirationDate, today)).toBe(urgency);
  });

  it('returns null for an invalid date', () => {
    expect(daysUntilExpiration('2026-02-31', today)).toBeNull();
    expect(getExpirationUrgency('not-a-date', today)).toBeNull();
  });
});
