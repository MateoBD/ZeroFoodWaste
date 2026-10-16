import { getExpirationNotificationDate } from './expirationNotifications';

describe('expiration notification scheduling', () => {
  it('schedules an alert at 09:00 on the threshold date', () => {
    const now = new Date(2026, 9, 10, 8, 30);
    const result = getExpirationNotificationDate('2026-10-15', 3, now);

    expect(result).not.toBeNull();
    expect(result).toEqual(new Date(2026, 9, 12, 9, 0));
  });

  it('moves an already eligible item to the next available morning', () => {
    const now = new Date(2026, 9, 13, 10, 0);
    const result = getExpirationNotificationDate('2026-10-15', 3, now);

    expect(result).toEqual(new Date(2026, 9, 14, 9, 0));
  });

  it('does not schedule an alert for an expired item', () => {
    const now = new Date(2026, 9, 13, 10, 0);

    expect(getExpirationNotificationDate('2026-10-12', 3, now)).toBeNull();
  });

  it('rejects malformed expiration dates', () => {
    expect(getExpirationNotificationDate('2026-02-31', 3, new Date())).toBeNull();
  });
});
