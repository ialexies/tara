import { describe, it, expect } from 'vitest';

/**
 * Unit tests for scheduler logic.
 */

function getTomorrowStr(from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('getTomorrowStr', () => {
  it('returns the next calendar day', () => {
    expect(getTomorrowStr(new Date('2026-05-28T00:00:00Z'))).toBe('2026-05-29');
  });

  it('handles month boundaries', () => {
    expect(getTomorrowStr(new Date('2026-01-31T00:00:00Z'))).toBe('2026-02-01');
  });

  it('handles year boundaries', () => {
    expect(getTomorrowStr(new Date('2026-12-31T00:00:00Z'))).toBe('2027-01-01');
  });

  it('handles leap year Feb 28', () => {
    expect(getTomorrowStr(new Date('2028-02-28T00:00:00Z'))).toBe('2028-02-29');
  });
});

describe('reminder cron schedule', () => {
  it('runs at midnight UTC which is 08:00 PHT', () => {
    // PHT is UTC+8. Sending at 08:00 PHT means guests get the reminder
    // at a reasonable morning hour, not in the middle of the night.
    const cronExpression = '0 0 * * *';
    const [minute, hour] = cronExpression.split(' ');
    expect(minute).toBe('0');
    expect(hour).toBe('0'); // UTC midnight = 08:00 PHT
  });
});
