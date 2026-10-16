import { addDays, daysUntil, fromDateInput, startOfDay, toDateInput } from './donation.service';
import { isPaused } from './models';

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });

describe('donation date helpers', () => {
  it('round-trips the date input format in local time', () => {
    expect(toDateInput(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(fromDateInput('2026-01-05')).toEqual(new Date(2026, 0, 5));
    expect(fromDateInput('')).toBeNull();
  });
  it('adds whole days from the start of the day, across month and year ends', () => {
    expect(addDays(new Date(2026, 9, 16, 18), 90)).toEqual(new Date(2027, 0, 14));
    expect(startOfDay(new Date(2026, 9, 16, 18, 5))).toEqual(new Date(2026, 9, 16));
  });
  it('counts days left, never below zero', () => {
    const now = new Date(2026, 9, 16, 22);
    expect(daysUntil(new Date(2026, 9, 17), now)).toBe(1);
    expect(daysUntil(new Date(2027, 0, 14), now)).toBe(90);
    expect(daysUntil(new Date(2026, 9, 1), now)).toBe(0);
  });
});

describe('isPaused', () => {
  const now = Date.UTC(2026, 9, 16);
  it('is paused only while the date is ahead', () => {
    expect(isPaused({ pausedUntil: ts(new Date(now + 86400_000)) }, now)).toBe(true);
    expect(isPaused({ pausedUntil: ts(new Date(now - 1)) }, now)).toBe(false);
  });
  it('treats no date (or no listing) as not paused', () => {
    expect(isPaused({}, now)).toBe(false);
    expect(isPaused(null, now)).toBe(false);
  });
});
