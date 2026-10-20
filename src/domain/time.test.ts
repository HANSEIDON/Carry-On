import { describe, expect, it } from 'vitest';
import { localHourMinute, localTime } from './time';

describe('local time', () => {
  const at = new Date('2026-10-20T05:13:00Z');

  it('formats the wall clock in a time zone', () => {
    expect(localTime('Asia/Seoul', at)).toBe('14:13');
    expect(localTime('Europe/London', at)).toBe('06:13');
  });

  it('splits it into hour and minute', () => {
    expect(localHourMinute('Asia/Seoul', at)).toEqual({ hour: 14, minute: 13 });
    expect(localHourMinute('America/New_York', at)).toEqual({ hour: 1, minute: 13 });
  });
});
